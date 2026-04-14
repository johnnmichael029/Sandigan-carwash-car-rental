const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateProducts = (req, res, next) => { invalidatePrefixes('product', 'inventory', 'sandi'); next(); };

// Public catalog for POS (All authenticated employees) — cached 2 min
router.get('/', requireAuth, cache('product', 120), productController.getProducts);

// Admin-only management
router.post('/', requireAuth, adminOnly, invalidateProducts, productController.createProduct);
router.patch('/:id', requireAuth, adminOnly, invalidateProducts, productController.updateProduct);
router.delete('/:id', requireAuth, adminOnly, invalidateProducts, productController.deleteProduct);

module.exports = router;
