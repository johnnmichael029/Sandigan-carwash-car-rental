const express = require('express');
const router = express.Router();
const stockMovementController = require('../controllers/stockMovementController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');

router.use(requireAuth, adminOnly);

router.get('/analytics', stockMovementController.getAnalytics);
router.get('/summary', stockMovementController.getAnalyticsSummary);
router.get('/item/:id', stockMovementController.getItemHistory);

module.exports = router;
