const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const { getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = require('../controllers/inventoryController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

router.get('/', requireAuth, cache('inventory', 120), getInventory);
router.post('/', requireAuth, adminOnly, (req, res, next) => { invalidatePrefixes('inventory', 'sandi'); next(); }, addInventoryItem);
router.patch('/:id', requireAuth, adminOnly, (req, res, next) => { invalidatePrefixes('inventory', 'sandi'); next(); }, updateInventoryItem);
router.delete('/:id', requireAuth, adminOnly, (req, res, next) => { invalidatePrefixes('inventory', 'sandi'); next(); }, deleteInventoryItem);

module.exports = router;
