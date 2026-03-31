const express = require('express');
const router = express.Router();
const { getSettings, updateSetting } = require('../controllers/settingController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');

// Get current settings
router.get('/', requireAuth, getSettings);

// Update/Upsert a setting (Admin only)
router.post('/update', requireAuth, adminOnly, updateSetting);

module.exports = router;
