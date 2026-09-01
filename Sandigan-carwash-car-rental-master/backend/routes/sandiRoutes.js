const express = require('express');
const router = express.Router();
const { getSandiInsights } = require('../controllers/sandiController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');

// Protect the insights so admins and department staff can see them
// Cache 10 min — this is an external AI call (Gemini), very expensive
router.get('/insights', requireAuth, (req, res, next) => {
    if (['super_admin', 'admin', 'department_staff'].includes(req.user.role)) return next();
    return res.status(403).json({ error: 'Access denied.' });
}, cache('sandi', 600), getSandiInsights);


module.exports = router;
