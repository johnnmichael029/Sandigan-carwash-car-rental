const express = require('express');
const router = express.Router();
const { getAllBills, createBill, recordBillPayment, getPayableSummary, getNextBillNumber } = require('../controllers/payableController');
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidatePayables = (req, res, next) => { invalidatePrefixes('payable', 'finance', 'forecast', 'sandi'); next(); };

// AP Dashboard summary — cached 2 min
router.get('/summary', requireAuth, requirePermission('Finance', 'read'), cache('payable', 120), getPayableSummary);

// Next bill number prediction — cached 30s
router.get('/next-bill-number', requireAuth, requirePermission('Finance', 'read'), cache('payable', 30), getNextBillNumber);

// All bills — cached 90s
router.get('/', requireAuth, requirePermission('Finance', 'read'), cache('payable', 90), getAllBills);

// Mutations — both invalidate finance + forecast (bill payments affect net profit)
router.post('/add', requireAuth, requirePermission('Finance', 'create'), invalidatePayables, createBill);
router.post('/:id/pay', requireAuth, requirePermission('Finance', 'update'), invalidatePayables, recordBillPayment);

module.exports = router;
