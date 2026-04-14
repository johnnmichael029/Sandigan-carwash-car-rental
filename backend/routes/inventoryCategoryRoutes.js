const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/inventoryCategoryController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateCat = (req, res, next) => { invalidatePrefixes('inv-cat', 'inventory'); next(); };

// Inventory categories — cached 1 hour (rarely changes)
router.get('/', requireAuth, cache('inv-cat', 3600), categoryController.getCategories);
router.post('/', requireAuth, adminOnly, invalidateCat, categoryController.createCategory);
router.patch('/:id', requireAuth, adminOnly, invalidateCat, categoryController.updateCategory);
router.delete('/:id', requireAuth, adminOnly, invalidateCat, categoryController.deleteCategory);

module.exports = router;
