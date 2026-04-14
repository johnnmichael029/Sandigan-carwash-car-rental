const express = require('express');
const router = express.Router();
const poController = require('../controllers/purchaseOrderController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidatePO = (req, res, next) => { invalidatePrefixes('po', 'inventory', 'sandi'); next(); };

router.use(requireAuth, adminOnly);

// Purchase order list — cached 90s
router.get('/', cache('po', 90), poController.getPOs);

// Receiving a PO updates inventory stock levels
router.post('/', invalidatePO, poController.createPO);
router.patch('/:id', invalidatePO, poController.updatePO);
router.post('/:id/receive', invalidatePO, poController.receivePO);
router.delete('/:id', invalidatePO, poController.deletePO);

module.exports = router;
