const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateProducts = (req, res, next) => { invalidatePrefixes('product', 'inventory', 'sandi'); next(); };

// Public catalog for POS / Inventory staff — cached 2 min
router.get('/', requireAuth, cache('product', 120), productController.getProducts);

// Permission-gated management
router.post('/', requireAuth, requirePermission('Inventory', 'create'), invalidateProducts, productController.createProduct);
router.patch('/:id', requireAuth, requirePermission('Inventory', 'update'), invalidateProducts, productController.updateProduct);
router.delete('/:id', requireAuth, requirePermission('Inventory', 'delete'), invalidateProducts, productController.deleteProduct);

module.exports = router;
