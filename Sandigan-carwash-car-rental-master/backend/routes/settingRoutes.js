const express = require('express');
const router = express.Router();
const { getSettings, updateSetting, getPaymentMethods, getRentalDownPaymentPercent } = require('../controllers/settingController');
const requireAuth = require('../middleware/requireAuth');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

// ── PUBLIC — No auth required (used by booking page) ─────────────────────────
router.get('/payment-methods', getPaymentMethods);
router.get('/rental-downpayment', getRentalDownPaymentPercent);

// Get current settings — cached 1 hour (rarely changes)
router.get('/', requireAuth, cache('settings', 3600), getSettings);

// Update/Upsert a setting — invalidates settings + forecast (commission rate affects calculations)
router.post('/update', requireAuth, (req, res, next) => {
    if (req.user.role === 'super_admin' || req.user.role === 'admin') return next();
    if (req.user.role === 'department_staff') {
        const perms = req.user.permissions instanceof Map ? Object.fromEntries(req.user.permissions) : (req.user.permissions || {});
        if (perms.Finance?.includes('update') || perms.Clientele?.includes('update') || perms.Operations?.includes('update') || perms.Inventory?.includes('update') || perms.Workforce?.includes('update')) {
            return next();
        }
    }
    return res.status(403).json({ error: 'Access denied. You do not have permission to update settings.' });
}, (req, res, next) => { invalidatePrefixes('settings', 'forecast', 'sandi'); next(); }, updateSetting);

module.exports = router;

