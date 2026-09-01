const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
=======
const adminOnly = require('../middleware/adminOnly');
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateProducts = (req, res, next) => { invalidatePrefixes('product', 'inventory', 'sandi'); next(); };

<<<<<<< HEAD
// Public catalog for POS / Inventory staff — cached 2 min
router.get('/', requireAuth, cache('product', 120), productController.getProducts);

// Permission-gated management
router.post('/', requireAuth, requirePermission('Inventory', 'create'), invalidateProducts, productController.createProduct);
router.patch('/:id', requireAuth, requirePermission('Inventory', 'update'), invalidateProducts, productController.updateProduct);
router.delete('/:id', requireAuth, requirePermission('Inventory', 'delete'), invalidateProducts, productController.deleteProduct);
=======
// Public catalog for POS (All authenticated employees) — cached 2 min
router.get('/', requireAuth, cache('product', 120), productController.getProducts);

// Admin-only management
router.post('/', requireAuth, adminOnly, invalidateProducts, productController.createProduct);
router.patch('/:id', requireAuth, adminOnly, invalidateProducts, productController.updateProduct);
router.delete('/:id', requireAuth, adminOnly, invalidateProducts, productController.deleteProduct);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
