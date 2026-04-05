const Revenue = require('../models/revenueModel');
const { createLog } = require('./activityLogController');

// ── GET all revenue records ──────────────────────────────────────
const getRevenues = async (req, res) => {
    try {
        const { from, to, category, source, search } = req.query;
        const filter = {};

        if (from || to) {
            filter.date = {};
            if (from) filter.date.$gte = new Date(from);
            if (to) {
                const end = new Date(to);
                end.setHours(23, 59, 59, 999);
                filter.date.$lte = end;
            }
        }
        if (category) filter.category = category;
        if (source) filter.source = source;

        if (search && search.trim()) {
            const query = search.trim();
            filter.$or = [
                { title: { $regex: query, $options: 'i' } },
                { category: { $regex: query, $options: 'i' } },
                { referenceId: { $regex: query, $options: 'i' } },
                { notes: { $regex: query, $options: 'i' } },
                // Allow searching by Date string (MM/DD/YYYY)
                { $expr: { 
                    $regexMatch: { 
                        input: { $dateToString: { format: "%m/%d/%Y", date: "$date" } }, 
                        regex: query, 
                        options: "i" 
                    } 
                } }
            ];
        }

        const revenues = await Revenue.find(filter)
            .populate('recordedBy', 'fullName role')
            .sort({ date: -1 });

        // Compute total
        const total = revenues.reduce((sum, r) => sum + (r.amount || 0), 0);

        res.status(200).json({ revenues, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── POST create a manual revenue entry ──────────────────────────
const createRevenue = async (req, res) => {
    try {
        const { title, amount, category, source, referenceId, notes, date } = req.body;
        const recordedBy = req.user ? req.user.id : null;

        const revenue = await Revenue.create({
            title, amount, category,
            source: source || 'Manual',
            referenceId: referenceId || null,
            notes: notes || '',
            date: date || new Date(),
            recordedBy
        });

        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'FINANCE',
                action: 'revenue_recorded',
                message: `Recorded income: ${title} (₱${amount.toLocaleString()})`,
                meta: { id: revenue._id, category, amount, source: source || 'Manual' }
            });
        }

        res.status(201).json(revenue);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// ── DELETE a revenue entry ────────────────────────────────────────
const deleteRevenue = async (req, res) => {
    try {
        const { id } = req.params;
        const revenue = await Revenue.findById(id);
        if (!revenue) return res.status(404).json({ error: 'Revenue not found' });

        await Revenue.findByIdAndDelete(id);

        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'FINANCE',
                action: 'revenue_deleted',
                message: `Deleted income record: ${revenue.title} (₱${revenue.amount.toLocaleString()})`,
                meta: { id, title: revenue.title, amount: revenue.amount }
            });
        }

        res.status(200).json({ message: 'Revenue record deleted.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── INTERNAL HELPER: called by other controllers to auto-record income ──
const recordRevenue = async ({ title, amount, category, source, referenceId, notes, recordedBy }) => {
    try {
        const revenue = await Revenue.create({
            title,
            amount,
            category: category || 'Service',
            source: source || 'Booking',
            referenceId: referenceId || null,
            notes: notes || '',
            recordedBy: recordedBy || null,
        });

        // Background Audit Log (Non-blocking)
        createLog({
            actorId: recordedBy || null,
            actorName: 'System/Auto',
            actorRole: source || 'system',
            module: 'FINANCE',
            action: 'income_auto_recorded',
            message: `Automated Income: ${title} (₱${amount.toLocaleString()}) via ${source || 'System'}`,
            meta: { id: revenue._id, source: source || 'Booking', amount }
        });

        return revenue;
    } catch (err) {
        console.error('Failed to auto-record revenue:', err.message);
        return null;
    }
};

module.exports = {
    getRevenues,
    createRevenue,
    deleteRevenue,
    recordRevenue,   // exported for use in other controllers
};
