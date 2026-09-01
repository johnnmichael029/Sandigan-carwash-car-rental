const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const { getBudgets, setBudget, deleteBudget } = require('../controllers/budgetController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateBudget = (req, res, next) => { invalidatePrefixes('budget', 'finance', 'sandi'); next(); };

router.get('/', requireAuth, requirePermission('Finance', 'read'), cache('budget', 120), getBudgets);
router.post('/', requireAuth, requirePermission('Finance', 'create'), invalidateBudget, setBudget);
router.delete('/:id', requireAuth, requirePermission('Finance', 'delete'), invalidateBudget, deleteBudget);

module.exports = router;
