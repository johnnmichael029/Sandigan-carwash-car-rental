const express = require('express');
const router = express.Router();
const stockMovementController = require('../controllers/stockMovementController');
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
const cache = require('../middleware/cacheMiddleware');

// Stock analytics — cached 3 min (read-only, analysis data)
router.get('/analytics', requireAuth, requirePermission('Inventory', 'read'), cache('stock', 180), stockMovementController.getAnalytics);
router.get('/summary', requireAuth, requirePermission('Inventory', 'read'), cache('stock', 180), stockMovementController.getAnalyticsSummary);
router.get('/item/:id', requireAuth, requirePermission('Inventory', 'read'), cache('stock', 90), stockMovementController.getItemHistory);
=======
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');

router.use(requireAuth, adminOnly);

// Stock analytics — cached 3 min (read-only, analysis data)
router.get('/analytics', cache('stock', 180), stockMovementController.getAnalytics);
router.get('/summary', cache('stock', 180), stockMovementController.getAnalyticsSummary);
router.get('/item/:id', cache('stock', 90), stockMovementController.getItemHistory);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
