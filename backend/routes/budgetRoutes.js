const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const { getBudgets, setBudget, deleteBudget } = require('../controllers/budgetController');

// All budget operations require Admin access
router.use(requireAuth, adminOnly);

// GET budgets with actuals (requires ?month=YYYY-MM)
router.get('/', getBudgets);

// POST create or update a budget
router.post('/', setBudget);

// DELETE a budget
router.delete('/:id', deleteBudget);

module.exports = router;
