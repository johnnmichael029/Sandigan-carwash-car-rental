const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/revenueCategoryController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateCat = (req, res, next) => { invalidatePrefixes('rev-cat', 'revenue'); next(); };

// Revenue categories — cached 1 hour (rarely changes)
router.get('/', requireAuth, cache('rev-cat', 3600), getCategories);
router.post('/', requireAuth, adminOnly, invalidateCat, createCategory);
router.patch('/:id', requireAuth, adminOnly, invalidateCat, updateCategory);
router.delete('/:id', requireAuth, adminOnly, invalidateCat, deleteCategory);

module.exports = router;
