const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const { getBills, createBill, deleteBill, updateBill, applyPendingBills } = require('../controllers/recurringBillController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateRecurring = (req, res, next) => { invalidatePrefixes('recurring', 'finance', 'forecast'); next(); };

// Recurring bill list — cached 2 min
router.get('/', requireAuth, requirePermission('Finance', 'read'), cache('recurring', 120), getBills);
router.post('/', requireAuth, requirePermission('Finance', 'create'), invalidateRecurring, createBill);
router.patch('/:id', requireAuth, requirePermission('Finance', 'update'), invalidateRecurring, updateBill);
router.delete('/:id', requireAuth, requirePermission('Finance', 'delete'), invalidateRecurring, deleteBill);
router.post('/apply', requireAuth, requirePermission('Finance', 'update'), invalidateRecurring, applyPendingBills);

module.exports = router;
