const express = require('express');
const router = express.Router();
const controller = require('../controllers/billCategoryController');
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateCat = (req, res, next) => { invalidatePrefixes('bill-cat', 'payable'); next(); };

// Bill categories — cached 1 hour (rarely changes)
router.get('/', requireAuth, requirePermission('Finance', 'read'), cache('bill-cat', 3600), controller.getCategories);
router.post('/', requireAuth, requirePermission('Finance', 'update'), invalidateCat, controller.createCategory);
router.patch('/:id', requireAuth, requirePermission('Finance', 'update'), invalidateCat, controller.updateCategory);
router.delete('/:id', requireAuth, requirePermission('Finance', 'delete'), invalidateCat, controller.deleteCategory);

module.exports = router;
