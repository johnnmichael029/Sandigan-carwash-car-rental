const express = require('express');
const router = express.Router();
const { getSandiInsights } = require('../controllers/sandiController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');

// Protect the insights so only admins can see them
// Cache 10 min — this is an external AI call (Gemini), very expensive
router.get('/insights', requireAuth, adminOnly, cache('sandi', 600), getSandiInsights);

module.exports = router;
