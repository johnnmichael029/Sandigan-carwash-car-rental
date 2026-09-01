const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/revenueCategoryController');
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateCat = (req, res, next) => { invalidatePrefixes('rev-cat', 'revenue'); next(); };

// Revenue categories — cached 1 hour (rarely changes)
router.get('/', requireAuth, requirePermission('Finance', 'read'), cache('rev-cat', 3600), getCategories);
router.post('/', requireAuth, requirePermission('Finance', 'update'), invalidateCat, createCategory);
router.patch('/:id', requireAuth, requirePermission('Finance', 'update'), invalidateCat, updateCategory);
router.delete('/:id', requireAuth, requirePermission('Finance', 'delete'), invalidateCat, deleteCategory);

module.exports = router;
