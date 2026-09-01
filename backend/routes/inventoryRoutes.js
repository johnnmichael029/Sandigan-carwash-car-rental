const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const { getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = require('../controllers/inventoryController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

router.get('/', requireAuth, requirePermission('Inventory', 'read'), cache('inventory', 120), getInventory);
router.post('/', requireAuth, requirePermission('Inventory', 'create'), (req, res, next) => { invalidatePrefixes('inventory', 'sandi'); next(); }, addInventoryItem);
router.patch('/:id', requireAuth, requirePermission('Inventory', 'update'), (req, res, next) => { invalidatePrefixes('inventory', 'sandi'); next(); }, updateInventoryItem);
router.delete('/:id', requireAuth, requirePermission('Inventory', 'delete'), (req, res, next) => { invalidatePrefixes('inventory', 'sandi'); next(); }, deleteInventoryItem);

module.exports = router;
