const Revenue = require('../models/revenueModel');

// ── GET all revenue records ──────────────────────────────────────
const getRevenues = async (req, res) => {
    try {
        const { from, to, category, source } = req.query;
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

        res.status(201).json(revenue);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// ── DELETE a revenue entry ────────────────────────────────────────
const deleteRevenue = async (req, res) => {
    try {
        await Revenue.findByIdAndDelete(req.params.id);
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
