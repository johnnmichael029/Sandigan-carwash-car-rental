const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const {
    addStamp,
    removeStamp,
    redeemReward,
    getCard,
    getConfig,
    updateConfig,
} = require('../controllers/loyaltyController');

// ── Card Lookup (any authenticated staff/admin) ────────────────────────────────
router.get('/card/:cardId', requireAuth, getCard);

// ── Stamp Management (staff) ──────────────────────────────────────────────────
router.post('/add-stamp', requireAuth, addStamp);
router.post('/remove-stamp', requireAuth, removeStamp);

// ── Reward Redemption (staff) ─────────────────────────────────────────────────
router.post('/redeem-reward', requireAuth, redeemReward);

// ── Loyalty Config (read: any auth user; update: Clientele or Finance update permission) ──
router.get('/config', requireAuth, getConfig);
router.put('/config', requireAuth, (req, res, next) => {
    if (req.user.role === 'super_admin' || req.user.role === 'admin') return next();
    if (req.user.role === 'department_staff') {
        const perms = req.user.permissions instanceof Map ? Object.fromEntries(req.user.permissions) : (req.user.permissions || {});
        if (perms.Clientele?.includes('update') || perms.Finance?.includes('update')) return next();
    }
    return res.status(403).json({ error: 'Access denied. You do not have permission to update loyalty configuration.' });
}, updateConfig);


module.exports = router;
