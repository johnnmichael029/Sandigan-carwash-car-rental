const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { getBills, createBill, deleteBill, updateBill, applyPendingBills } = require('../controllers/recurringBillController');

router.get('/', requireAuth, getBills);
router.post('/', requireAuth, createBill);
router.patch('/:id', requireAuth, updateBill);
router.delete('/:id', requireAuth, deleteBill);
router.post('/apply', requireAuth, applyPendingBills);

module.exports = router;
