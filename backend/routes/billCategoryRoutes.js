const express = require('express');
const router = express.Router();
const controller = require('../controllers/billCategoryController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateCat = (req, res, next) => { invalidatePrefixes('bill-cat', 'payable'); next(); };

// Bill categories — cached 1 hour (rarely changes)
router.get('/', requireAuth, cache('bill-cat', 3600), controller.getCategories);
router.post('/', requireAuth, adminOnly, invalidateCat, controller.createCategory);
router.patch('/:id', requireAuth, adminOnly, invalidateCat, controller.updateCategory);
router.delete('/:id', requireAuth, adminOnly, invalidateCat, controller.deleteCategory);

module.exports = router;
