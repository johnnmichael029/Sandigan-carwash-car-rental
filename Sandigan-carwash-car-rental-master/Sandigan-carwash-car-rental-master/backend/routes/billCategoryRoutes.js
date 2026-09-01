const express = require('express');
const router = express.Router();
const controller = require('../controllers/billCategoryController');
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
=======
const adminOnly = require('../middleware/adminOnly');
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateCat = (req, res, next) => { invalidatePrefixes('bill-cat', 'payable'); next(); };

// Bill categories — cached 1 hour (rarely changes)
<<<<<<< HEAD
router.get('/', requireAuth, requirePermission('Finance', 'read'), cache('bill-cat', 3600), controller.getCategories);
router.post('/', requireAuth, requirePermission('Finance', 'update'), invalidateCat, controller.createCategory);
router.patch('/:id', requireAuth, requirePermission('Finance', 'update'), invalidateCat, controller.updateCategory);
router.delete('/:id', requireAuth, requirePermission('Finance', 'delete'), invalidateCat, controller.deleteCategory);
=======
router.get('/', requireAuth, cache('bill-cat', 3600), controller.getCategories);
router.post('/', requireAuth, adminOnly, invalidateCat, controller.createCategory);
router.patch('/:id', requireAuth, adminOnly, invalidateCat, controller.updateCategory);
router.delete('/:id', requireAuth, adminOnly, invalidateCat, controller.deleteCategory);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
