const express = require('express');
const router = express.Router();
const Attendance = require('../models/attendanceModel');
const requireAuth = require('../middleware/requireAuth');

/**
 * Handle Clock In and Clock Out toggle
 */
router.post('/clock', requireAuth, async (req, res) => {
    try {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        let record = await Attendance.findOne({ employee: req.employeeId, dateStr });

        if (!record) {
            // First time clocking in today
            record = await Attendance.create({
                employee: req.employeeId,
                dateStr,
                clockInTime: new Date()
            });
            return res.json({ message: 'Clocked In Successfully!', status: 'Clocked In', record });
        } else if (!record.clockOutTime) {
            // Already clocked in, now clocking out
            record.clockOutTime = new Date();
            const diffMs = record.clockOutTime.getTime() - record.clockInTime.getTime();
            record.durationMinutes = Math.floor(diffMs / 60000);
            await record.save();
            return res.json({ message: 'Clocked Out Successfully! Have a great rest of your day.', status: 'Clocked Out', record });
        } else {
            // Already clocked out
            return res.status(400).json({ error: 'You have already completed your shift today.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Get today's attendance status
 */
router.get('/today', requireAuth, async (req, res) => {
    try {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const record = await Attendance.findOne({ employee: req.employeeId, dateStr });
        if (!record) return res.json({ status: 'Not Clocked In' });
        if (!record.clockOutTime) return res.json({ status: 'Clocked In', time: record.clockInTime });
        return res.json({ status: 'Clocked Out', inTime: record.clockInTime, outTime: record.clockOutTime, duration: record.durationMinutes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Get all attendance logs (Admin Only)
 */
router.get('/all', requireAuth, async (req, res) => {
    try {
        if (req.employeeRole !== 'admin') {
            return res.status(403).json({ error: 'Permission denied. Admins only.' });
        }

        const limit = parseInt(req.query.limit) || 100;

        const records = await Attendance.find()
            .populate('employee', 'fullName fullname role name') // fetch possible name variations
            .sort({ createdAt: -1 })
            .limit(limit);

        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
