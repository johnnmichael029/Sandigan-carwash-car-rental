const express = require('express');
const router = express.Router();
const { getSettings, updateSetting } = require('../controllers/settingController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

// Get current settings — cached 1 hour (rarely changes)
router.get('/', requireAuth, cache('settings', 3600), getSettings);

// Update/Upsert a setting — invalidates settings + forecast (commission rate affects calculations)
router.post('/update', requireAuth, adminOnly, (req, res, next) => { invalidatePrefixes('settings', 'forecast', 'sandi'); next(); }, updateSetting);

module.exports = router;
