const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/revenueCategoryController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');

// Route applies to: /api/revenue-categories

// All authenticated staff can see categories for display purposes
router.get('/', requireAuth, getCategories);

// Management (Admin only)
router.post('/', requireAuth, adminOnly, createCategory);
router.patch('/:id', requireAuth, adminOnly, updateCategory);
router.delete('/:id', requireAuth, adminOnly, deleteCategory);

module.exports = router;
