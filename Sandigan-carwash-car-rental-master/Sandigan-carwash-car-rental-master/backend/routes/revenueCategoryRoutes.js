const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/revenueCategoryController');
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
=======
const adminOnly = require('../middleware/adminOnly');
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateCat = (req, res, next) => { invalidatePrefixes('rev-cat', 'revenue'); next(); };

// Revenue categories — cached 1 hour (rarely changes)
<<<<<<< HEAD
router.get('/', requireAuth, requirePermission('Finance', 'read'), cache('rev-cat', 3600), getCategories);
router.post('/', requireAuth, requirePermission('Finance', 'update'), invalidateCat, createCategory);
router.patch('/:id', requireAuth, requirePermission('Finance', 'update'), invalidateCat, updateCategory);
router.delete('/:id', requireAuth, requirePermission('Finance', 'delete'), invalidateCat, deleteCategory);
=======
router.get('/', requireAuth, cache('rev-cat', 3600), getCategories);
router.post('/', requireAuth, adminOnly, invalidateCat, createCategory);
router.patch('/:id', requireAuth, adminOnly, invalidateCat, updateCategory);
router.delete('/:id', requireAuth, adminOnly, invalidateCat, deleteCategory);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
