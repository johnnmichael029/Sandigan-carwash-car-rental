const express = require('express');
const router = express.Router();
const { getAllBills, createBill, recordBillPayment, getPayableSummary, getNextBillNumber } = require('../controllers/payableController');
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
=======
const adminOnly = require('../middleware/adminOnly');
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidatePayables = (req, res, next) => { invalidatePrefixes('payable', 'finance', 'forecast', 'sandi'); next(); };

// AP Dashboard summary — cached 2 min
<<<<<<< HEAD
router.get('/summary', requireAuth, requirePermission('Finance', 'read'), cache('payable', 120), getPayableSummary);

// Next bill number prediction — cached 30s
router.get('/next-bill-number', requireAuth, requirePermission('Finance', 'read'), cache('payable', 30), getNextBillNumber);

// All bills — cached 90s
router.get('/', requireAuth, requirePermission('Finance', 'read'), cache('payable', 90), getAllBills);

// Mutations — both invalidate finance + forecast (bill payments affect net profit)
router.post('/add', requireAuth, requirePermission('Finance', 'create'), invalidatePayables, createBill);
router.post('/:id/pay', requireAuth, requirePermission('Finance', 'update'), invalidatePayables, recordBillPayment);
=======
router.get('/summary', requireAuth, adminOnly, cache('payable', 120), getPayableSummary);

// Next bill number prediction — cached 30s
router.get('/next-bill-number', requireAuth, adminOnly, cache('payable', 30), getNextBillNumber);

// All bills — cached 90s
router.get('/', requireAuth, cache('payable', 90), getAllBills);

// Mutations — both invalidate finance + forecast (bill payments affect net profit)
router.post('/add', requireAuth, adminOnly, invalidatePayables, createBill);
router.post('/:id/pay', requireAuth, adminOnly, invalidatePayables, recordBillPayment);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
