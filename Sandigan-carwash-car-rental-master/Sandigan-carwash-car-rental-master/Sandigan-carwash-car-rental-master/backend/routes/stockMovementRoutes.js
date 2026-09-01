const express = require('express');
const router = express.Router();
const stockMovementController = require('../controllers/stockMovementController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');

router.use(requireAuth, adminOnly);

// Stock analytics — cached 3 min (read-only, analysis data)
router.get('/analytics', cache('stock', 180), stockMovementController.getAnalytics);
router.get('/summary', cache('stock', 180), stockMovementController.getAnalyticsSummary);
router.get('/item/:id', cache('stock', 90), stockMovementController.getItemHistory);

module.exports = router;
