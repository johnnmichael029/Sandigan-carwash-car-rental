const express = require('express');
const router = express.Router();
const { getSandiInsights } = require('../controllers/sandiController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');

// Protect the insights so only admins can see them
router.get('/insights', requireAuth, adminOnly, getSandiInsights);

module.exports = router;
