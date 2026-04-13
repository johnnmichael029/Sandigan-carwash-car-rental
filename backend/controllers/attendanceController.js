const Attendance = require('../models/attendanceModel');
const Holiday = require('../models/holidayModel');

/**
 * Helper to get YYYY-MM-DD in local time
 */
const getLocalDateStr = (date = new Date()) => {
    // Force Philippine Time (UTC+8) manually to avoid server timezone issues
    const phtDate = new Date(date.getTime() + (8 * 60 * 60 * 1000));
    return phtDate.toISOString().split('T')[0];
};

/**
 * Handle Clock In and Clock Out toggle
 */
const clockToggle = async (req, res) => {
    try {
        const Employee = require('../models/employeeModel');
        const employee = await Employee.findById(req.employeeId);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const dateStr = getLocalDateStr();

        let record = await Attendance.findOne({ employee: req.employeeId, dateStr });

        if (!record) {
            // Check for holiday
            const holiday = await Holiday.findOne({ dateStr });
            const holidayType = holiday ? holiday.type : 'None';
            const holidayName = holiday ? holiday.name : '';

            // Check if present yesterday (for holiday pay eligibility)
            const d = new Date();
            const yesterday = new Date(d);
            yesterday.setDate(d.getDate() - 1);
            const yesterdayStr = yesterday.toLocaleDateString('en-CA');
            const yesterdayRecord = await Attendance.findOne({ employee: req.employeeId, dateStr: yesterdayStr });
            const wasPresentYesterday = !!(yesterdayRecord && yesterdayRecord.clockOutTime);

            // First time clocking in today
            record = await Attendance.create({
                employee: req.employeeId,
                dateStr,
                clockInTime: new Date(),
                holidayType,
                holidayName,
                wasPresentYesterday
            });
            return res.json({ message: 'Clocked In Successfully!', status: 'Clocked In', record });
        } else if (!record.clockOutTime) {
            // ... rest of logic stays same but using getLocalDateStr() for safety if needed ...
            const now = new Date();
            record.clockOutTime = now;

            // --- SHIFT LOGIC ---
            let effectiveInTime = new Date(record.clockInTime);

            // If they have a specific shift and start time, we clamp the start time
            // Example "08:00 AM" or "05:00 PM" or "17:00"
            if (employee.shiftType !== 'None' && employee.shiftStartTime) {
                const [time, modifier] = employee.shiftStartTime.split(' ');
                let [hours, minutes] = time.split(':').map(Number);

                if (modifier === 'PM' && hours < 12) hours += 12;
                if (modifier === 'AM' && hours === 12) hours = 0;

                const shiftStart = new Date(record.clockInTime);
                shiftStart.setHours(hours, minutes, 0, 0);

                // If they clocked in earlier than their shift, payroll starts at shift start
                if (effectiveInTime < shiftStart) {
                    effectiveInTime = shiftStart;
                }
            }

            // Calculate duration in minutes
            const diffMs = record.clockOutTime.getTime() - effectiveInTime.getTime();
            let durationMinutes = Math.floor(diffMs / 60000);

            // Automatic Break Deduction
            const shiftInHour = effectiveInTime.getHours();
            const shiftOutHour = now.getHours();

            if (employee.shiftType === 'Morning') {
                // Morning Break (12:00 PM - 1:00 PM)
                if (shiftInHour < 12 && shiftOutHour >= 13) durationMinutes = Math.max(0, durationMinutes - 60);
            } else if (employee.shiftType === 'Night') {
                // Night Break (12:00 AM - 1:00 AM)
                // Shift in before midnight, shift out after 1 AM
                if ((shiftInHour >= 20 || shiftInHour < 0) && (shiftOutHour >= 1 || shiftOutHour < shiftInHour)) {
                    durationMinutes = Math.max(0, durationMinutes - 60);
                }
            } else if (durationMinutes > 300) {
                durationMinutes -= 60;
            }

            record.durationMinutes = durationMinutes;

            // --- OT LOGIC (NEW: Clock-Time Based) ---
            let overtimeMinutes = 0;
            const clockOut = new Date(record.clockOutTime);

            if (employee.shiftType === 'Morning') {
                // Morning shift ends at 17:00 (5:00 PM)
                const shiftEnd = new Date(record.clockInTime);
                shiftEnd.setHours(17, 0, 0, 0);
                if (clockOut > shiftEnd) {
                    overtimeMinutes = Math.floor((clockOut - shiftEnd) / 60000);
                }
            } else if (employee.shiftType === 'Night') {
                // Night shift ends 5 AM
                const shiftEnd = new Date(record.clockInTime);
                shiftEnd.setHours(5, 0, 0, 0);
                if (shiftEnd < record.clockInTime) shiftEnd.setDate(shiftEnd.getDate() + 1);
                if (clockOut > shiftEnd) {
                    overtimeMinutes = Math.floor((clockOut - shiftEnd) / 60000);
                }
            } else {
                // Standard 8-hour / 480-minute logic for 'None' or others
                const standardMinutes = 480;
                if (durationMinutes > standardMinutes) {
                    overtimeMinutes = durationMinutes - standardMinutes;
                }
            }

            record.overtimeMinutes = overtimeMinutes;
            await record.save();
            return res.json({ message: 'Clocked Out Successfully!', status: 'Clocked Out', record });
        } else {
            return res.status(400).json({ error: 'You have already completed your shift today.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Admin Controlled Clock In/Out (For staff without accounts)
 */
const adminClockToggle = async (req, res) => {
    try {
        const { employeeId } = req.body;
        if (!employeeId) return res.status(400).json({ error: 'employeeId is required.' });

        const Employee = require('../models/employeeModel');
        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const dateStr = getLocalDateStr();
        // Look for ANY active shift (even from previous days) to allow closing forgotten clock-outs
        let record = await Attendance.findOne({ employee: employeeId, clockOutTime: null });

        if (!record) {
            // Check if they already completed a shift TODAY
            const todayRecord = await Attendance.findOne({ employee: employeeId, dateStr });
            if (todayRecord) return res.status(400).json({ error: 'Employee already completed shift today.' });

            // Clock In Logic
            const holiday = await Holiday.findOne({ dateStr });
            const holidayType = holiday ? holiday.type : 'None';
            const holidayName = holiday ? holiday.name : '';

            const d = new Date();
            const yesterday = new Date(d);
            yesterday.setDate(d.getDate() - 1);
            const yesterdayStr = yesterday.toLocaleDateString('en-CA');
            const yesterdayRecord = await Attendance.findOne({ employee: employeeId, dateStr: yesterdayStr });
            const wasPresentYesterday = !!(yesterdayRecord && yesterdayRecord.clockOutTime);

            record = await Attendance.create({
                employee: employeeId,
                dateStr,
                clockInTime: new Date(),
                holidayType,
                holidayName,
                wasPresentYesterday
            });
            return res.json({ message: `Clocked IN ${employee.fullName} successfully.`, status: 'Clocked In', record });
        } else if (!record.clockOutTime) {
            // Clock Out Logic
            const now = new Date();
            record.clockOutTime = now;

            let effectiveInTime = new Date(record.clockInTime);
            if (employee.shiftType !== 'None' && employee.shiftStartTime) {
                const [time, modifier] = employee.shiftStartTime.split(' ');
                let [hours, minutes] = time.split(':').map(Number);
                if (modifier === 'PM' && hours < 12) hours += 12;
                if (modifier === 'AM' && hours === 12) hours = 0;
                const shiftStart = new Date(record.clockInTime);
                shiftStart.setHours(hours, minutes, 0, 0);
                if (effectiveInTime < shiftStart) effectiveInTime = shiftStart;
            }

            const diffMs = record.clockOutTime.getTime() - effectiveInTime.getTime();
            let durationMinutes = Math.floor(diffMs / 60000);

            // Smart Break Logic
            const shiftInHour = effectiveInTime.getHours();
            const shiftOutHour = now.getHours();

            if (employee.shiftType === 'Morning' && shiftInHour < 12 && shiftOutHour >= 13) {
                durationMinutes = Math.max(0, durationMinutes - 60);
            } else if (employee.shiftType === 'Night' && (shiftInHour >= 20 || shiftInHour < 0) && (shiftOutHour >= 1 || shiftOutHour < shiftInHour)) {
                durationMinutes = Math.max(0, durationMinutes - 60);
            } else if (durationMinutes > 300) {
                durationMinutes -= 60;
            }

            record.durationMinutes = durationMinutes;

            // --- ADMIN OT LOGIC (NEW: Clock-Time Based) ---
            let overtimeMinutes = 0;
            const clockOut = new Date(record.clockOutTime);

            if (employee.shiftType === 'Morning') {
                const shiftEnd = new Date(record.clockInTime);
                shiftEnd.setHours(17, 0, 0, 0);
                if (clockOut > shiftEnd) overtimeMinutes = Math.floor((clockOut - shiftEnd) / 60000);
            } else if (employee.shiftType === 'Night') {
                const shiftEnd = new Date(record.clockInTime);
                shiftEnd.setHours(5, 0, 0, 0);
                if (shiftEnd < record.clockInTime) shiftEnd.setDate(shiftEnd.getDate() + 1);
                if (clockOut > shiftEnd) overtimeMinutes = Math.floor((clockOut - shiftEnd) / 60000);
            } else {
                const standardMinutes = 480;
                if (durationMinutes > standardMinutes) overtimeMinutes = durationMinutes - standardMinutes;
            }

            record.overtimeMinutes = overtimeMinutes;
            await record.save();
            return res.json({ message: `Clocked OUT ${employee.fullName} successfully.`, status: 'Clocked Out', record });
        } else {
            return res.status(400).json({ error: 'Employee already completed shift today.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Approve Overtime (Admin Only)
 */
const approveOT = async (req, res) => {
    try {
        if (req.employeeRole !== 'admin') {
            return res.status(403).json({ error: 'Permission denied. Admins only.' });
        }

        const { attendanceId, approved } = req.body;
        const record = await Attendance.findById(attendanceId);
        if (!record) return res.status(404).json({ error: 'Attendance record not found.' });

        record.isOTApproved = approved;
        record.approvedBy = req.employeeId;
        await record.save();

        res.json({ message: `Overtime ${approved ? 'Approved' : 'Disapproved'} successfully.`, record });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get today's attendance status
 */
const getTodayStatus = async (req, res) => {
    try {
        const dateStr = getLocalDateStr();

        // 1. Check if they have an ACTIVE shift (no clock out yet)
        const activeRecord = await Attendance.findOne({ employee: req.employeeId, clockOutTime: null });
        if (activeRecord) {
            return res.json({ status: 'Clocked In', time: activeRecord.clockInTime, record: activeRecord });
        }

        // 2. Otherwise, check if they COMPLETED a shift today
        const completedRecord = await Attendance.findOne({ employee: req.employeeId, dateStr }).sort({ createdAt: -1 });
        if (completedRecord && completedRecord.clockOutTime) {
            return res.json({
                status: 'Clocked Out',
                inTime: completedRecord.clockInTime,
                outTime: completedRecord.clockOutTime,
                duration: completedRecord.durationMinutes
            });
        }

        return res.json({ status: 'Not Clocked In' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get all attendance logs (Admin Only)
 */
const getAllAttendance = async (req, res) => {
    try {
        if (req.employeeRole !== 'admin') {
            return res.status(403).json({ error: 'Permission denied. Admins only.' });
        }

        const limit = parseInt(req.query.limit) || 200;

        const records = await Attendance.find({})
            .populate('employee', 'fullName fullname role name baseSalary salaryFrequency shiftType shiftStartTime employeeId')
            .sort({ createdAt: -1 })
            .limit(limit);

        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update attendance details (Admin Only)
 */
const updateAttendance = async (req, res) => {
    try {
        if (req.employeeRole !== 'admin') {
            return res.status(403).json({ error: 'Permission denied. Admins only.' });
        }

        const { holidayType, holidayName, wasPresentYesterday, clockInTime, clockOutTime } = req.body;
        const record = await Attendance.findById(req.params.id).populate('employee');
        if (!record) return res.status(404).json({ error: 'Attendance record not found.' });

        if (holidayType !== undefined) record.holidayType = holidayType;
        if (holidayName !== undefined) record.holidayName = holidayName;
        if (wasPresentYesterday !== undefined) record.wasPresentYesterday = wasPresentYesterday;

        if (clockInTime && !isNaN(new Date(clockInTime).getTime())) {
            record.clockInTime = new Date(clockInTime);
            // Re-sync dateStr with new clockInTime to ensure reports show the correct 'Work Day'
            record.dateStr = getLocalDateStr(record.clockInTime);
        }
        if (clockOutTime && !isNaN(new Date(clockOutTime).getTime())) record.clockOutTime = new Date(clockOutTime);
        else if (clockOutTime === '') record.clockOutTime = null; 

        // If clock times are updated, RECALCULATE DURATION & OT
        if (record.clockInTime && record.clockOutTime) {
            const employee = record.employee;
            let effectiveInTime = new Date(record.clockInTime);

            // Shift clamping
            if (employee && employee.shiftType !== 'None' && employee.shiftStartTime) {
                // Handle formats like "08:00" or "8:00 AM"
                const parts = employee.shiftStartTime.split(' ');
                const timeStr = parts[0];
                const modifier = parts[1];
                let [hours, minutes] = timeStr.split(':').map(Number);

                if (modifier === 'PM' && hours < 12) hours += 12;
                if (modifier === 'AM' && hours === 12) hours = 0;

                if (!isNaN(hours) && !isNaN(minutes)) {
                    const shiftStart = new Date(record.clockInTime);
                    shiftStart.setHours(hours, minutes, 0, 0);
                    if (effectiveInTime < shiftStart) effectiveInTime = shiftStart;
                }
            }

            const diffMs = record.clockOutTime.getTime() - effectiveInTime.getTime();
            let durationMinutes = Math.floor(diffMs / 60000);

            // Smart Break Logic
            const shiftInHour = effectiveInTime.getHours();
            const shiftOutHour = record.clockOutTime.getHours();

            if (employee.shiftType === 'Morning' && shiftInHour < 12 && shiftOutHour >= 13) {
                durationMinutes = Math.max(0, durationMinutes - 60);
            } else if (employee.shiftType === 'Night' && (shiftInHour >= 20 || shiftInHour < 4) && (shiftOutHour >= 1 || shiftOutHour < shiftInHour)) {
                durationMinutes = Math.max(0, durationMinutes - 60);
            } else if (durationMinutes > 300) {
                durationMinutes -= 60;
            }
            record.durationMinutes = durationMinutes;

            // OT LOGIC
            let overtimeMinutes = 0;
            const clockOut = new Date(record.clockOutTime);
            if (employee.shiftType === 'Morning') {
                const shiftEnd = new Date(record.clockInTime);
                shiftEnd.setHours(17, 0, 0, 0);
                if (clockOut > shiftEnd) overtimeMinutes = Math.floor((clockOut - shiftEnd) / 60000);
            } else if (employee.shiftType === 'Night') {
                const shiftEnd = new Date(record.clockInTime);
                shiftEnd.setHours(5, 0, 0, 0);
                if (shiftEnd < record.clockInTime) shiftEnd.setDate(shiftEnd.getDate() + 1);
                if (clockOut > shiftEnd) overtimeMinutes = Math.floor((clockOut - shiftEnd) / 60000);
            } else {
                const standardMinutes = 480;
                if (durationMinutes > standardMinutes) overtimeMinutes = durationMinutes - standardMinutes;
            }
            record.overtimeMinutes = overtimeMinutes;
        }

        await record.save();
        res.json({ message: 'Attendance updated successfully.', record });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Delete attendance record (Admin Only)
 */
const deleteAttendance = async (req, res) => {
    try {
        if (req.employeeRole !== 'admin') {
            return res.status(403).json({ error: 'Permission denied. Admins only.' });
        }
        await Attendance.findByIdAndDelete(req.params.id);
        res.json({ message: 'Attendance record deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    clockToggle,
    approveOT,
    getTodayStatus,
    getAllAttendance,
    updateAttendance,
    deleteAttendance,
    adminClockToggle
};
