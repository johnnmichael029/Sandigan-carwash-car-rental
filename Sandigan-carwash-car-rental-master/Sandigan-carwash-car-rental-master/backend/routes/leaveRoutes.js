const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
=======
const adminOnly = require('../middleware/adminOnly');
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const { createLeave, getAllLeaves, updateLeaveStatus, deleteLeave, updateLeaveBalances } = require('../controllers/leaveController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateLeave = (req, res, next) => { invalidatePrefixes('leave', 'attendance', 'payroll'); next(); };

// Leave list — cached 60s
<<<<<<< HEAD
router.get('/all', requireAuth, requirePermission('Workforce', 'read'), cache('leave', 60), getAllLeaves);

router.post('/', requireAuth, requirePermission('Workforce', 'create'), invalidateLeave, createLeave);
router.patch('/:id/status', requireAuth, requirePermission('Workforce', 'update'), invalidateLeave, updateLeaveStatus);
router.delete('/:id', requireAuth, requirePermission('Workforce', 'delete'), invalidateLeave, deleteLeave);
router.patch('/balances', requireAuth, requirePermission('Workforce', 'update'), invalidateLeave, updateLeaveBalances);
=======
router.get('/all', requireAuth, adminOnly, cache('leave', 60), getAllLeaves);

router.post('/', requireAuth, adminOnly, invalidateLeave, createLeave);
router.patch('/:id/status', requireAuth, adminOnly, invalidateLeave, updateLeaveStatus);
router.delete('/:id', requireAuth, adminOnly, invalidateLeave, deleteLeave);
router.patch('/balances', requireAuth, adminOnly, invalidateLeave, updateLeaveBalances);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
