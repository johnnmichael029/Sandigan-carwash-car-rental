const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
=======
const adminOnly = require('../middleware/adminOnly');
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const { getBudgets, setBudget, deleteBudget } = require('../controllers/budgetController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateBudget = (req, res, next) => { invalidatePrefixes('budget', 'finance', 'sandi'); next(); };

<<<<<<< HEAD
router.get('/', requireAuth, requirePermission('Finance', 'read'), cache('budget', 120), getBudgets);
router.post('/', requireAuth, requirePermission('Finance', 'create'), invalidateBudget, setBudget);
router.delete('/:id', requireAuth, requirePermission('Finance', 'delete'), invalidateBudget, deleteBudget);
=======
router.use(requireAuth, adminOnly);

// Cached 2 min — budget data changes only when admin sets/deletes a budget
router.get('/', cache('budget', 120), getBudgets);
router.post('/', invalidateBudget, setBudget);
router.delete('/:id', invalidateBudget, deleteBudget);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
