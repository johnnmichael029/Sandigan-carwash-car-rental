const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidatePayroll = (req, res, next) => { invalidatePrefixes('payroll', 'finance', 'forecast', 'sandi'); next(); };

// GET commission summaries — cached 90s
router.get('/summary', requireAuth, adminOnly, cache('payroll', 90), payrollController.getPayrollSummary);

// Mark commissions paid — invalidates payroll + finance
router.post('/mark-paid', requireAuth, adminOnly, invalidatePayroll, payrollController.markCommissionPaid);

// Pay salary — invalidates payroll + finance
router.post('/pay-salary', requireAuth, adminOnly, invalidatePayroll, payrollController.payFixedSalary);

// GET payout history — cached 90s
router.get('/history', requireAuth, adminOnly, cache('payroll', 90), payrollController.getPayoutHistory);

// GET pending fixed salary — cached 60s
router.get('/pending-fixed', requireAuth, adminOnly, cache('payroll', 60), payrollController.getPendingFixedSalary);

// Bulk operations — both invalidate downstream caches
router.post('/bulk-mark-paid', requireAuth, adminOnly, invalidatePayroll, payrollController.bulkMarkCommissionPaid);
router.post('/bulk-pay-salary', requireAuth, adminOnly, invalidatePayroll, payrollController.bulkPayFixedSalary);

module.exports = router;
