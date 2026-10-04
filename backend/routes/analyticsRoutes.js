const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const analyticsController = require('../controllers/analyticsController');

router.get('/dashboard', requireAuth, analyticsController.getDashboardAnalytics);

module.exports = router;
