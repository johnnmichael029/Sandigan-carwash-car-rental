const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
/**
 * Handle Clock In and Clock Out toggle
 */
router.post('/clock', requireAuth, attendanceController.clockToggle);

/**
 * Approve Overtime (Admin Only)
 */
router.post('/approve-ot', requireAuth, adminOnly, attendanceController.approveOT);

/**
 * Get today's attendance status
 */
router.get('/today', requireAuth, adminOnly, attendanceController.getTodayStatus);

/**
 * Get all attendance logs (Admin Only)
 */
router.get('/all', requireAuth, adminOnly, attendanceController.getAllAttendance);

/**
 * Update holiday status (Admin Only)
 */
router.patch('/:id', requireAuth, adminOnly, attendanceController.updateHolidayStatus);

/**
 * Admin Controlled Clocking (For staff without accounts)
 */
router.post('/admin-clock', requireAuth, adminOnly, attendanceController.adminClockToggle);

module.exports = router;
