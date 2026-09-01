const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateAttendance = (req, res, next) => { invalidatePrefixes('attendance', 'payroll', 'sandi'); next(); };

// Clock In / Clock Out (Employee self-service)
router.post('/clock', requireAuth, invalidateAttendance, attendanceController.clockToggle);

// Approve Overtime
router.post('/approve-ot', requireAuth, requirePermission('Workforce', 'update'), invalidateAttendance, attendanceController.approveOT);

// Get today's attendance status — short 30s TTL, changes on clock events
router.get('/today', requireAuth, cache('attendance', 30), attendanceController.getTodayStatus);

// Get all attendance logs
router.get('/all', requireAuth, requirePermission('Workforce', 'read'), cache('attendance', 60), attendanceController.getAllAttendance);

// Update attendance
router.patch('/:id', requireAuth, requirePermission('Workforce', 'update'), invalidateAttendance, attendanceController.updateAttendance);

// Delete attendance record
router.delete('/:id', requireAuth, requirePermission('Workforce', 'delete'), invalidateAttendance, attendanceController.deleteAttendance);

// Admin / Workforce Controlled Clocking
router.post('/admin-clock', requireAuth, requirePermission('Workforce', 'update'), invalidateAttendance, attendanceController.adminClockToggle);

module.exports = router;
