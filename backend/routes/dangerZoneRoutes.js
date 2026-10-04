const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { wipeData, backupData, getStats } = require('../controllers/dangerZoneController');

// Super Admin ONLY middleware
const superAdminOnly = (req, res, next) => {
    if (req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, error: 'Access denied. Super Admin only.' });
    }
    next();
};

// All routes require auth + super admin
router.use(requireAuth, superAdminOnly);

router.get('/stats', getStats);
router.post('/wipe', wipeData);
router.get('/backup', backupData);

module.exports = router;
