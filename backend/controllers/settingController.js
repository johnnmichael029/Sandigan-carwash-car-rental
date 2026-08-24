const Setting = require('../models/settingModel');
const { createLog } = require('./activityLogController');

// Get all settings
const getSettings = async (req, res) => {
    try {
        const settings = await Setting.find();
        res.status(200).json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update a specific setting (or create if not exists)
const updateSetting = async (req, res) => {
    const { key, value } = req.body;
    try {
        const setting = await Setting.findOneAndUpdate(
            { key },
            { value },
            { returnDocument: 'after', upsert: true, runValidators: true }
        );

        // Activity Log
        await createLog({
            actorId: req.user._id,
            actorName: req.user.fullName,
            actorRole: req.user.role,
            module: 'SETTINGS',
            action: 'setting_updated',
            message: `Updated system setting: ${key} to ${JSON.stringify(value)}`,
            meta: { key, value }
        });

        res.status(200).json(setting);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Internal helper for other controllers
const getSettingValue = async (key, defaultValue) => {
    try {
        const setting = await Setting.findOne({ key });
        return setting ? setting.value : defaultValue;
    } catch (err) {
        return defaultValue;
    }
};

// ─── PUBLIC: Payment Methods ──────────────────────────────────────────────────
// GET /api/settings/payment-methods
// Returns only active payment methods, sorted by sortOrder.
// Used by the public booking page — no auth required.
const getPaymentMethods = async (req, res) => {
    try {
        const setting = await Setting.findOne({ key: 'payment_methods' });
        const methods = Array.isArray(setting?.value) ? setting.value : [];
        const active = methods
            .filter(m => m.isActive)
            .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
        res.status(200).json(active);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── PUBLIC: Rental Down Payment Percentage ───────────────────────────────────
// GET /api/settings/rental-downpayment
// Returns the configured down payment % for car rentals (default: 30).
// Used by the public booking page — no auth required.
const getRentalDownPaymentPercent = async (req, res) => {
    try {
        const setting = await Setting.findOne({ key: 'rental_down_payment_percent' });
        res.status(200).json({ percent: setting?.value ?? 30 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getSettings,
    updateSetting,
    getSettingValue,
    getPaymentMethods,
    getRentalDownPaymentPercent,
};
