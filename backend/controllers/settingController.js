const Setting = require('../models/settingModel');

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
            { new: true, upsert: true }
        );
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
