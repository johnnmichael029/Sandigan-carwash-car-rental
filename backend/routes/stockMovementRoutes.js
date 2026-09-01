const express = require('express');
const router = express.Router();
const stockMovementController = require('../controllers/stockMovementController');
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const cache = require('../middleware/cacheMiddleware');

// Stock analytics — cached 3 min (read-only, analysis data)
router.get('/analytics', requireAuth, requirePermission('Inventory', 'read'), cache('stock', 180), stockMovementController.getAnalytics);
router.get('/summary', requireAuth, requirePermission('Inventory', 'read'), cache('stock', 180), stockMovementController.getAnalyticsSummary);
router.get('/item/:id', requireAuth, requirePermission('Inventory', 'read'), cache('stock', 90), stockMovementController.getItemHistory);

module.exports = router;
