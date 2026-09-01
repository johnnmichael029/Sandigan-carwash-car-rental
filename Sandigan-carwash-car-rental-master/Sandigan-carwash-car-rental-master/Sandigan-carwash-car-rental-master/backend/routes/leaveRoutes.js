const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const { createLeave, getAllLeaves, updateLeaveStatus, deleteLeave, updateLeaveBalances } = require('../controllers/leaveController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateLeave = (req, res, next) => { invalidatePrefixes('leave', 'attendance', 'payroll'); next(); };

// Leave list — cached 60s
router.get('/all', requireAuth, adminOnly, cache('leave', 60), getAllLeaves);

router.post('/', requireAuth, adminOnly, invalidateLeave, createLeave);
router.patch('/:id/status', requireAuth, adminOnly, invalidateLeave, updateLeaveStatus);
router.delete('/:id', requireAuth, adminOnly, invalidateLeave, deleteLeave);
router.patch('/balances', requireAuth, adminOnly, invalidateLeave, updateLeaveBalances);

module.exports = router;
