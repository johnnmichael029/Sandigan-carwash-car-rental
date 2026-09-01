const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
=======
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const { getBills, createBill, deleteBill, updateBill, applyPendingBills } = require('../controllers/recurringBillController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateRecurring = (req, res, next) => { invalidatePrefixes('recurring', 'finance', 'forecast'); next(); };

// Recurring bill list — cached 2 min
<<<<<<< HEAD
router.get('/', requireAuth, requirePermission('Finance', 'read'), cache('recurring', 120), getBills);
router.post('/', requireAuth, requirePermission('Finance', 'create'), invalidateRecurring, createBill);
router.patch('/:id', requireAuth, requirePermission('Finance', 'update'), invalidateRecurring, updateBill);
router.delete('/:id', requireAuth, requirePermission('Finance', 'delete'), invalidateRecurring, deleteBill);
router.post('/apply', requireAuth, requirePermission('Finance', 'update'), invalidateRecurring, applyPendingBills);
=======
router.get('/', requireAuth, cache('recurring', 120), getBills);

router.post('/', requireAuth, invalidateRecurring, createBill);
router.patch('/:id', requireAuth, invalidateRecurring, updateBill);
router.delete('/:id', requireAuth, invalidateRecurring, deleteBill);
// Apply pending bills creates expense records — also clears finance/forecast
router.post('/apply', requireAuth, invalidateRecurring, applyPendingBills);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
