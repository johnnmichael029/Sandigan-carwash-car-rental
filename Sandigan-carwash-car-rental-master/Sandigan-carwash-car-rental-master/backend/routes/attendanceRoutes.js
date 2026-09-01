const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
=======
const adminOnly = require('../middleware/adminOnly');
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateAttendance = (req, res, next) => { invalidatePrefixes('attendance', 'payroll', 'sandi'); next(); };

<<<<<<< HEAD
// Clock In / Clock Out (Employee self-service)
router.post('/clock', requireAuth, invalidateAttendance, attendanceController.clockToggle);

// Approve Overtime
router.post('/approve-ot', requireAuth, requirePermission('Workforce', 'update'), invalidateAttendance, attendanceController.approveOT);
=======
// Clock In / Clock Out
router.post('/clock', requireAuth, invalidateAttendance, attendanceController.clockToggle);

// Approve Overtime (Admin Only)
router.post('/approve-ot', requireAuth, adminOnly, invalidateAttendance, attendanceController.approveOT);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

// Get today's attendance status — short 30s TTL, changes on clock events
router.get('/today', requireAuth, cache('attendance', 30), attendanceController.getTodayStatus);

<<<<<<< HEAD
// Get all attendance logs
router.get('/all', requireAuth, requirePermission('Workforce', 'read'), cache('attendance', 60), attendanceController.getAllAttendance);

// Update attendance
router.patch('/:id', requireAuth, requirePermission('Workforce', 'update'), invalidateAttendance, attendanceController.updateAttendance);

// Delete attendance record
router.delete('/:id', requireAuth, requirePermission('Workforce', 'delete'), invalidateAttendance, attendanceController.deleteAttendance);

// Admin / Workforce Controlled Clocking
router.post('/admin-clock', requireAuth, requirePermission('Workforce', 'update'), invalidateAttendance, attendanceController.adminClockToggle);
=======
// Get all attendance logs (Admin Only)
router.get('/all', requireAuth, adminOnly, cache('attendance', 60), attendanceController.getAllAttendance);

// Update attendance (Admin Only)
router.patch('/:id', requireAuth, adminOnly, invalidateAttendance, attendanceController.updateAttendance);

// Delete attendance record (Admin Only)
router.delete('/:id', requireAuth, adminOnly, invalidateAttendance, attendanceController.deleteAttendance);

// Admin Controlled Clocking
router.post('/admin-clock', requireAuth, adminOnly, invalidateAttendance, attendanceController.adminClockToggle);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
