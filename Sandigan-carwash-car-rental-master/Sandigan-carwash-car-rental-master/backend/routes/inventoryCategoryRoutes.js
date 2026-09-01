const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/inventoryCategoryController');
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
=======
const adminOnly = require('../middleware/adminOnly');
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateCat = (req, res, next) => { invalidatePrefixes('inv-cat', 'inventory'); next(); };

// Inventory categories — cached 1 hour (rarely changes)
<<<<<<< HEAD
router.get('/', requireAuth, requirePermission('Inventory', 'read'), cache('inv-cat', 3600), categoryController.getCategories);
router.post('/', requireAuth, requirePermission('Inventory', 'update'), invalidateCat, categoryController.createCategory);
router.patch('/:id', requireAuth, requirePermission('Inventory', 'update'), invalidateCat, categoryController.updateCategory);
router.delete('/:id', requireAuth, requirePermission('Inventory', 'delete'), invalidateCat, categoryController.deleteCategory);
=======
router.get('/', requireAuth, cache('inv-cat', 3600), categoryController.getCategories);
router.post('/', requireAuth, adminOnly, invalidateCat, categoryController.createCategory);
router.patch('/:id', requireAuth, adminOnly, invalidateCat, categoryController.updateCategory);
router.delete('/:id', requireAuth, adminOnly, invalidateCat, categoryController.deleteCategory);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
