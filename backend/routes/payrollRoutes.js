const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
/**
 * GET /api/payroll/summary?period=today|week|month
 * Returns per-detailer commission summaries for the given period.
 */
router.get('/summary', requireAuth, adminOnly, payrollController.getPayrollSummary);

/**
 * POST /api/payroll/mark-paid
 * Mark all unpaid commissions for a detailer as Paid, and record an expense.
 */
router.post('/mark-paid', requireAuth, adminOnly, payrollController.markCommissionPaid);

/**
 * POST /api/payroll/pay-salary
 * Logs a standard salary payment for a regular employee/admin (Includes Holiday/OT calc)
 */
router.post('/pay-salary', requireAuth, adminOnly, payrollController.payFixedSalary);

/**
 * GET /api/payroll/history
 * Returns the ledger of all past payments to staff
 */
router.get('/history', requireAuth, adminOnly, payrollController.getPayoutHistory);

router.get('/pending-fixed', requireAuth, adminOnly, payrollController.getPendingFixedSalary);
router.post('/bulk-mark-paid', requireAuth, adminOnly, payrollController.bulkMarkCommissionPaid);
router.post('/bulk-pay-salary', requireAuth, adminOnly, payrollController.bulkPayFixedSalary);

module.exports = router;
