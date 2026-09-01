const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/inventoryCategoryController');
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateCat = (req, res, next) => { invalidatePrefixes('inv-cat', 'inventory'); next(); };

// Inventory categories — cached 1 hour (rarely changes)
router.get('/', requireAuth, requirePermission('Inventory', 'read'), cache('inv-cat', 3600), categoryController.getCategories);
router.post('/', requireAuth, requirePermission('Inventory', 'update'), invalidateCat, categoryController.createCategory);
router.patch('/:id', requireAuth, requirePermission('Inventory', 'update'), invalidateCat, categoryController.updateCategory);
router.delete('/:id', requireAuth, requirePermission('Inventory', 'delete'), invalidateCat, categoryController.deleteCategory);

module.exports = router;
