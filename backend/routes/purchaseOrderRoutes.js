const express = require('express');
const router = express.Router();
const poController = require('../controllers/purchaseOrderController');
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidatePO = (req, res, next) => { invalidatePrefixes('po', 'inventory', 'sandi'); next(); };

// Purchase order list — cached 90s
router.get('/', requireAuth, requirePermission('Inventory', 'read'), cache('po', 90), poController.getPOs);

// Receiving a PO updates inventory stock levels
router.post('/', requireAuth, requirePermission('Inventory', 'create'), invalidatePO, poController.createPO);
router.patch('/:id', requireAuth, requirePermission('Inventory', 'update'), invalidatePO, poController.updatePO);
router.post('/:id/receive', requireAuth, requirePermission('Inventory', 'update'), invalidatePO, poController.receivePO);
router.delete('/:id', requireAuth, requirePermission('Inventory', 'delete'), invalidatePO, poController.deletePO);

module.exports = router;
