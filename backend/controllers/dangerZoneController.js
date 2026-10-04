const mongoose = require('mongoose');
const { createLog } = require('./activityLogController');

/**
 * Safe archiver factory — mirrors the working helper in exportController.js.
 * archiver v8 is an ES Module, so we must use dynamic import().
 */
async function createArchive(formatType = 'zip', options = {}) {
    try {
        const archiverModule = await import('archiver');
        if (formatType === 'zip' && archiverModule.ZipArchive) {
            return new archiverModule.ZipArchive(options);
        }
        if (formatType === 'tar' && archiverModule.TarArchive) {
            return new archiverModule.TarArchive(options);
        }
        const archiverFn = typeof archiverModule.default === 'function'
            ? archiverModule.default
            : archiverModule;
        if (typeof archiverFn === 'function') {
            return archiverFn(formatType, options);
        }
        throw new Error('No valid archive constructor found in module.');
    } catch (err) {
        throw new Error('Archiver package failed to initialize: ' + err.message);
    }
}


// These are the models that will be wiped based on the scope selected.
// 'all' wipes everything including users. 'operational' keeps users & settings.

const OPERATIONAL_COLLECTIONS = [
    'bookings',
    'carrentals',
    'revenues',
    'expenses',
    'payables',
    'payouts',
    'retailsales',
    'budgets',
    'employees',
    'attendances',
    'leaves',
    'inventories',
    'stockmovements',
    'purchaseorders',
    'products',
    'customers',
    'memberships',
    'promotions',
    'loyalties',
    'activitylogs',
    'notifications',
    'maintenanceprojects',
    'assets',
    'recurringbills',
    'revenuecategories',
    'billcategories',
    'inventorycategories',
    'vendors',
    'crmtags',
];

const FULL_RESET_EXTRAS = [
    'users',
    'settings',
    'vehicletypes',
    'pricings',
    'rentalfleets',
    'bays',
];

/**
 * POST /api/danger-zone/wipe
 * Body: { scope: 'operational' | 'full', confirmPhrase: string }
 * Super Admin only.
 */
exports.wipeData = async (req, res) => {
    try {
        const { scope = 'operational', confirmPhrase } = req.body;

        // Safety check: phrase must match exactly
        const REQUIRED_PHRASE = scope === 'full' ? 'DELETE EVERYTHING' : 'DELETE ALL DATA';
        if (confirmPhrase !== REQUIRED_PHRASE) {
            return res.status(400).json({
                success: false,
                error: `Confirmation phrase does not match. Expected: "${REQUIRED_PHRASE}"`
            });
        }

        const db = mongoose.connection.db;
        const collections = OPERATIONAL_COLLECTIONS.slice();
        if (scope === 'full') {
            collections.push(...FULL_RESET_EXTRAS);
        }

        const results = {};
        let totalDeleted = 0;

        for (const collName of collections) {
            try {
                const col = db.collection(collName);
                const res2 = await col.deleteMany({});
                results[collName] = res2.deletedCount;
                totalDeleted += res2.deletedCount;
            } catch (err) {
                // Collection may not exist — not fatal
                results[collName] = `skipped: ${err.message}`;
            }
        }

        // Audit log (only if we kept users — for full wipe, log anyway)
        try {
            await createLog({
                actorId: req.user._id,
                actorName: req.user.fullName || 'Super Admin',
                actorRole: req.user.role,
                module: 'SYSTEM',
                action: 'danger_zone_wipe',
                message: `⚠️ DANGER ZONE: Data wipe executed (scope: ${scope}). Total records deleted: ${totalDeleted}`,
                meta: { scope, totalDeleted, collections: results }
            });
        } catch (_) { /* If users were wiped, log may fail — that's OK */ }

        res.json({
            success: true,
            message: `Data wipe complete (scope: ${scope}).`,
            totalDeleted,
            details: results
        });

    } catch (err) {
        console.error('[DANGER_ZONE_WIPE_ERROR]', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * GET /api/danger-zone/backup
 * Streams a full JSON backup of all collections as a ZIP file.
 * Super Admin only.
 */
exports.backupData = async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

        // Fetch all collection names dynamically
        const colInfoList = await db.listCollections().toArray();
        const colNames = colInfoList.map(c => c.name).sort();

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="sandigan_backup_${timestamp}.zip"`);

        const archive = await createArchive('zip', { zlib: { level: 6 } });
        archive.pipe(res);


        // Add a metadata manifest
        const manifest = {
            system: 'Sandigan Carwash & Car Rental ERP',
            generatedAt: new Date().toISOString(),
            generatedBy: req.user.fullName || 'Super Admin',
            collectionsIncluded: colNames.length,
            collections: colNames
        };
        archive.append(JSON.stringify(manifest, null, 2), { name: `_manifest.json` });

        // Stream each collection as a separate JSON file
        for (const colName of colNames) {
            try {
                const col = db.collection(colName);
                const docs = await col.find({}).toArray();
                const jsonStr = JSON.stringify(docs, null, 2);
                archive.append(jsonStr, { name: `collections/${colName}.json` });
            } catch (err) {
                const errJson = JSON.stringify({ error: err.message });
                archive.append(errJson, { name: `collections/${colName}.error.json` });
            }
        }

        await archive.finalize();

        // Audit log after backup
        createLog({
            actorId: req.user._id,
            actorName: req.user.fullName || 'Super Admin',
            actorRole: req.user.role,
            module: 'SYSTEM',
            action: 'danger_zone_backup',
            message: `💾 DANGER ZONE: Full system backup downloaded (${colNames.length} collections).`,
            meta: { collections: colNames, timestamp }
        }).catch(() => {});

    } catch (err) {
        console.error('[DANGER_ZONE_BACKUP_ERROR]', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};

/**
 * GET /api/danger-zone/stats
 * Returns record counts per collection for the confirmation dialog.
 * Super Admin only.
 */
exports.getStats = async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const colInfoList = await db.listCollections().toArray();
        const colNames = colInfoList.map(c => c.name).sort();

        const stats = {};
        let total = 0;
        for (const colName of colNames) {
            try {
                const count = await db.collection(colName).countDocuments();
                stats[colName] = count;
                total += count;
            } catch (_) {
                stats[colName] = 0;
            }
        }

        res.json({ success: true, total, stats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
