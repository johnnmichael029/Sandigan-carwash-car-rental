const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');

// Public catalog for POS (All authenticated employees)
router.get('/', requireAuth, productController.getProducts);

// Admin-only management routes
router.post('/', requireAuth, adminOnly, productController.createProduct);
router.patch('/:id', requireAuth, adminOnly, productController.updateProduct);
router.delete('/:id', requireAuth, adminOnly, productController.deleteProduct);

module.exports = router;
