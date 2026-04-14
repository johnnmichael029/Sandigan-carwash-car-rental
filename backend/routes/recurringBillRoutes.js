const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { getBills, createBill, deleteBill, updateBill, applyPendingBills } = require('../controllers/recurringBillController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateRecurring = (req, res, next) => { invalidatePrefixes('recurring', 'finance', 'forecast'); next(); };

// Recurring bill list — cached 2 min
router.get('/', requireAuth, cache('recurring', 120), getBills);

router.post('/', requireAuth, invalidateRecurring, createBill);
router.patch('/:id', requireAuth, invalidateRecurring, updateBill);
router.delete('/:id', requireAuth, invalidateRecurring, deleteBill);
// Apply pending bills creates expense records — also clears finance/forecast
router.post('/apply', requireAuth, invalidateRecurring, applyPendingBills);

module.exports = router;
