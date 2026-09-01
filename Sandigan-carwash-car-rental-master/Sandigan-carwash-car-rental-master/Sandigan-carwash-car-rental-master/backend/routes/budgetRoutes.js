const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const { getBudgets, setBudget, deleteBudget } = require('../controllers/budgetController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateBudget = (req, res, next) => { invalidatePrefixes('budget', 'finance', 'sandi'); next(); };

router.use(requireAuth, adminOnly);

// Cached 2 min — budget data changes only when admin sets/deletes a budget
router.get('/', cache('budget', 120), getBudgets);
router.post('/', invalidateBudget, setBudget);
router.delete('/:id', invalidateBudget, deleteBudget);

module.exports = router;
