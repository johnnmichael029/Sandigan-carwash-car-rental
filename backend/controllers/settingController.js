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

module.exports = {
    getSettings,
    updateSetting,
    getSettingValue
};
