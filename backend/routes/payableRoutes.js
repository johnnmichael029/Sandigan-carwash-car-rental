const express = require('express');
const router = express.Router();
const { getAllBills, createBill, recordBillPayment, getPayableSummary, getNextBillNumber } = require('../controllers/payableController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');

// 1. Overall AP Dashboard (Total Debt, Overdue, Upcoming)
router.get('/summary', requireAuth, adminOnly, getPayableSummary);

// 1.1 Generate next sequential bill number (Frontend Prediction)
router.get('/next-bill-number', requireAuth, adminOnly, getNextBillNumber);

// 2. Fetch all bills (filterable by status, vendor, overdue)
router.get('/', requireAuth, getAllBills);

// 3. Create a new bill (AP record)
router.post('/add', requireAuth, adminOnly, createBill);

// 4. Critical Logic: Record a full or partial payment for a bill
// This will auto-sync to the financial expense logs.
router.post('/:id/pay', requireAuth, adminOnly, recordBillPayment);

module.exports = router;
