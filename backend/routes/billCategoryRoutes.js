const express = require('express');
const router = express.Router();
const controller = require('../controllers/billCategoryController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');

router.get('/', requireAuth, controller.getCategories);
router.post('/', requireAuth, adminOnly, controller.createCategory);
router.patch('/:id', requireAuth, adminOnly, controller.updateCategory);
router.delete('/:id', requireAuth, adminOnly, controller.deleteCategory);

module.exports = router;
