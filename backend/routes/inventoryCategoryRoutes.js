const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/inventoryCategoryController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');

// Route applies to: /api/inventory-categories

router.get('/', requireAuth, categoryController.getCategories);

// Admin-only management
router.post('/', requireAuth, adminOnly, categoryController.createCategory);
router.patch('/:id', requireAuth, adminOnly, categoryController.updateCategory);
router.delete('/:id', requireAuth, adminOnly, categoryController.deleteCategory);

module.exports = router;
