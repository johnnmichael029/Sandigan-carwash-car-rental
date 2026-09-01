const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const { createLeave, getAllLeaves, updateLeaveStatus, deleteLeave, updateLeaveBalances } = require('../controllers/leaveController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateLeave = (req, res, next) => { invalidatePrefixes('leave', 'attendance', 'payroll'); next(); };

// Leave list — cached 60s
router.get('/all', requireAuth, requirePermission('Workforce', 'read'), cache('leave', 60), getAllLeaves);

router.post('/', requireAuth, requirePermission('Workforce', 'create'), invalidateLeave, createLeave);
router.patch('/:id/status', requireAuth, requirePermission('Workforce', 'update'), invalidateLeave, updateLeaveStatus);
router.delete('/:id', requireAuth, requirePermission('Workforce', 'delete'), invalidateLeave, deleteLeave);
router.patch('/balances', requireAuth, requirePermission('Workforce', 'update'), invalidateLeave, updateLeaveBalances);

module.exports = router;
