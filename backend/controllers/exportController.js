const archiverPkg = require('archiver');
const { DATASETS, DATASET_MAP, DEPARTMENTS, MAX_ROWS } = require('../utils/exportRegistry');
const { buildCSV, buildExcel, buildPDF, formatCell } = require('../utils/exportBuilder');
const { createLog } = require('./activityLogController');

/**
 * Safe archiver factory helper to support Node ES module dynamic import (archiver v8 is type: module)
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
        const archiverFn = typeof archiverModule.default === 'function' ? archiverModule.default : archiverModule;
        if (typeof archiverFn === 'function') {
            return archiverFn(formatType, options);
        }
        throw new Error('No valid archive constructor found in module.');
    } catch (err) {
        throw new Error('Archiver package failed to initialize: ' + err.message);
    }
}

/**
 * Checks if the current user has permission to export the given dataset
 */
function canExportDataset(user, dataset) {
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    if (role === 'super_admin' || role === 'admin') return true;

    // Admin-only datasets (Dashboard & System Audit Logs)
    if (dataset.department === 'Dashboard' || dataset.department === 'System') {
        return false;
    }

    if (role === 'department_staff') {
        const userPerms = user.permissions instanceof Map
            ? user.permissions.get(dataset.department)
            : user.permissions?.[dataset.department];

        // Check if user has explicit 'export' action permission
        if (Array.isArray(userPerms) && userPerms.includes('export')) {
            return true;
        }
    }

    return false;
}

/**
 * GET /api/exports/datasets
 * Returns available datasets grouped by department for the current user
 */
exports.getAvailableDatasets = async (req, res) => {
    try {
        const user = req.user;
        const available = DATASETS.filter(d => canExportDataset(user, d));

        const grouped = DEPARTMENTS.map(dept => {
            const items = available.filter(d => d.department === dept.key);
            return {
                departmentKey: dept.key,
                departmentLabel: dept.label,
                adminOnly: !!dept.adminOnly,
                datasets: items.map(d => ({
                    key: d.key,
                    label: d.label,
                    hasDateFilter: !!d.dateField
                }))
            };
        }).filter(g => g.datasets.length > 0);

        res.json({ success: true, departments: grouped });
    } catch (err) {
        console.error('[EXPORT_DATASETS_ERROR]', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * GET /api/exports/:datasetKey
 * Query params: format (csv|xlsx|pdf), from, to
 */
exports.exportSingleDataset = async (req, res) => {
    try {
        const { datasetKey } = req.params;
        const { format = 'csv', from, to } = req.query;

        const dataset = DATASET_MAP[datasetKey];
        if (!dataset) {
            return res.status(404).json({ success: false, error: 'Dataset not found.' });
        }

        if (!canExportDataset(req.user, dataset)) {
            return res.status(403).json({ success: false, error: `Access denied. You do not have permission to export ${dataset.label}.` });
        }

        const fromDate = from ? new Date(from) : null;
        const toDate = to ? new Date(to) : null;
        if (toDate) toDate.setHours(23, 59, 59, 999);

        const fetched = await dataset.fetch({ from: fromDate, to: toDate, limit: MAX_ROWS });
        const rows = Array.isArray(fetched) ? fetched : [];

        // Audit Log
        createLog({
            actorId: req.user._id,
            actorName: req.user.fullName || 'Admin',
            actorRole: req.user.role,
            module: dataset.department.toUpperCase() === 'SYSTEM' ? 'SYSTEM' : (dataset.department.toUpperCase() === 'DASHBOARD' ? 'SYSTEM' : dataset.department.toUpperCase()),
            action: 'data_exported',
            message: `Exported ${dataset.label} (${format.toUpperCase()}, ${rows.length} rows)`,
            meta: { datasetKey, format, count: rows.length, from, to }
        });

        const filenameSanitized = dataset.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const timestamp = new Date().toISOString().slice(0, 10);

        if (format === 'xlsx') {
            const buffer = await buildExcel(dataset.columns, rows, dataset.label);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filenameSanitized}_${timestamp}.xlsx"`);
            return res.send(buffer);
        }

        if (format === 'pdf') {
            const buffer = await buildPDF(dataset.columns, rows, dataset.label);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filenameSanitized}_${timestamp}.pdf"`);
            return res.send(buffer);
        }

        // Default to CSV
        const csvString = buildCSV(dataset.columns, rows);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filenameSanitized}_${timestamp}.csv"`);
        return res.send(csvString);

    } catch (err) {
        console.error('[EXPORT_SINGLE_ERROR]', err);
        res.status(500).json({ success: false, error: err.message || 'Export failed.' });
    }
};

/**
 * POST /api/exports/multi
 * Body: { datasetKeys: [...], format: 'xlsx'|'zip', from, to }
 * Export multiple selected datasets into one multi-sheet Excel file or a ZIP of files.
 */
exports.exportMultiDatasets = async (req, res) => {
    try {
        const { datasetKeys = [], format = 'xlsx', from, to } = req.body;

        if (!Array.isArray(datasetKeys) || datasetKeys.length === 0) {
            return res.status(400).json({ success: false, error: 'Please select at least one dataset to export.' });
        }

        const validDatasets = datasetKeys
            .map(key => DATASET_MAP[key])
            .filter(d => d && canExportDataset(req.user, d));

        if (validDatasets.length === 0) {
            return res.status(403).json({ success: false, error: 'No authorized datasets selected.' });
        }

        const fromDate = from ? new Date(from) : null;
        const toDate = to ? new Date(to) : null;
        if (toDate) toDate.setHours(23, 59, 59, 999);

        // Fetch all datasets in parallel with safe error boundary per dataset
        const results = await Promise.all(
            validDatasets.map(async (ds) => {
                try {
                    const fetched = await ds.fetch({ from: fromDate, to: toDate, limit: MAX_ROWS });
                    return { ds, rows: Array.isArray(fetched) ? fetched : [] };
                } catch (err) {
                    console.error(`[EXPORT_FETCH_ERROR] dataset: ${ds.key}`, err);
                    return { ds, rows: [] };
                }
            })
        );

        // Audit Log
        createLog({
            actorId: req.user._id,
            actorName: req.user.fullName || 'Admin',
            actorRole: req.user.role,
            module: 'SYSTEM',
            action: 'data_exported_multi',
            message: `Exported Multi-Department Report (${validDatasets.length} datasets, ${format.toUpperCase()})`,
            meta: { datasets: datasetKeys, format, from, to }
        });

        const timestamp = new Date().toISOString().slice(0, 10);

        if (format === 'xlsx') {
            const ExcelJS = require('exceljs');
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Sandigan Carwash & Car Rental System';
            workbook.created = new Date();

            const createdSheets = new Set();

            results.forEach(({ ds, rows }) => {
                let baseName = (ds.label || ds.key).replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Sheet';
                baseName = baseName.slice(0, 31);

                let sheetName = baseName;
                let counter = 1;
                while (createdSheets.has(sheetName.toLowerCase())) {
                    const suffix = `_${counter++}`;
                    sheetName = `${baseName.slice(0, 31 - suffix.length)}${suffix}`;
                }
                createdSheets.add(sheetName.toLowerCase());

                const sheet = workbook.addWorksheet(sheetName);

                sheet.columns = ds.columns.map(col => ({
                    header: col.header,
                    key: col.key,
                    width: col.width || 20
                }));

                const headerRow = sheet.getRow(1);
                headerRow.height = 28;
                headerRow.eachCell((cell) => {
                    cell.font = { name: 'Poppins', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                });

                (rows || []).forEach(row => {
                    if (!row || typeof row !== 'object') return;
                    const rowData = {};
                    ds.columns.forEach(col => {
                        const rawVal = row[col.key];
                        if (col.type === 'money' || col.type === 'number') {
                            rowData[col.key] = Number(rawVal) || 0;
                        } else {
                            rowData[col.key] = formatCell(rawVal, col.type);
                        }
                    });
                    const addedRow = sheet.addRow(rowData);
                    addedRow.height = 20;

                    ds.columns.forEach((col, colIdx) => {
                        if (col.type === 'money') {
                            addedRow.getCell(colIdx + 1).numFmt = '"₱"#,##0.00';
                        }
                    });
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="sandigan_multi_report_${timestamp}.xlsx"`);
            return res.send(buffer);
        }

        // Format == 'zip' (ZIP file containing individual CSVs)
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="sandigan_export_package_${timestamp}.zip"`);

        const archive = await createArchive('zip', { zlib: { level: 9 } });
        archive.pipe(res);

        for (const { ds, rows } of results) {
            const csvStr = buildCSV(ds.columns, rows || []);
            const fname = `${ds.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`;
            archive.append(csvStr, { name: fname });
        }

        await archive.finalize();

    } catch (err) {
        console.error('[EXPORT_MULTI_ERROR]', err);
        res.status(500).json({ success: false, error: err.message || 'Multi-dataset export failed.' });
    }
};
