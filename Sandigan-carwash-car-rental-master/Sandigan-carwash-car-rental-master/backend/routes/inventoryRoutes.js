const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
=======
const adminOnly = require('../middleware/adminOnly');
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const { getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = require('../controllers/inventoryController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

<<<<<<< HEAD
router.get('/', requireAuth, requirePermission('Inventory', 'read'), cache('inventory', 120), getInventory);
router.post('/', requireAuth, requirePermission('Inventory', 'create'), (req, res, next) => { invalidatePrefixes('inventory', 'sandi'); next(); }, addInventoryItem);
router.patch('/:id', requireAuth, requirePermission('Inventory', 'update'), (req, res, next) => { invalidatePrefixes('inventory', 'sandi'); next(); }, updateInventoryItem);
router.delete('/:id', requireAuth, requirePermission('Inventory', 'delete'), (req, res, next) => { invalidatePrefixes('inventory', 'sandi'); next(); }, deleteInventoryItem);
=======
router.get('/', requireAuth, cache('inventory', 120), getInventory);
router.post('/', requireAuth, adminOnly, (req, res, next) => { invalidatePrefixes('inventory', 'sandi'); next(); }, addInventoryItem);
router.patch('/:id', requireAuth, adminOnly, (req, res, next) => { invalidatePrefixes('inventory', 'sandi'); next(); }, updateInventoryItem);
router.delete('/:id', requireAuth, adminOnly, (req, res, next) => { invalidatePrefixes('inventory', 'sandi'); next(); }, deleteInventoryItem);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
