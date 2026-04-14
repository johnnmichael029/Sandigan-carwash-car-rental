const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateAttendance = (req, res, next) => { invalidatePrefixes('attendance', 'payroll', 'sandi'); next(); };

// Clock In / Clock Out
router.post('/clock', requireAuth, invalidateAttendance, attendanceController.clockToggle);

// Approve Overtime (Admin Only)
router.post('/approve-ot', requireAuth, adminOnly, invalidateAttendance, attendanceController.approveOT);

// Get today's attendance status — short 30s TTL, changes on clock events
router.get('/today', requireAuth, cache('attendance', 30), attendanceController.getTodayStatus);

// Get all attendance logs (Admin Only)
router.get('/all', requireAuth, adminOnly, cache('attendance', 60), attendanceController.getAllAttendance);

// Update attendance (Admin Only)
router.patch('/:id', requireAuth, adminOnly, invalidateAttendance, attendanceController.updateAttendance);

// Delete attendance record (Admin Only)
router.delete('/:id', requireAuth, adminOnly, invalidateAttendance, attendanceController.deleteAttendance);

// Admin Controlled Clocking
router.post('/admin-clock', requireAuth, adminOnly, invalidateAttendance, attendanceController.adminClockToggle);

module.exports = router;
