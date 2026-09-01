const Leave = require('../models/leaveModel');
const Attendance = require('../models/attendanceModel');
const Employee = require('../models/employeeModel');

/**
 * Helper: Get all business dates (Mon-Sat) between two date strings inclusive
 */
const getBusinessDates = (startStr, endStr) => {
    const dates = [];
    const current = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    while (current <= end) {
        const day = current.getDay(); // 0=Sun, 6=Sat
        if (day !== 0) { // exclude Sundays only (Saturdays are work days for carwash)
            dates.push(current.toLocaleDateString('en-CA')); // YYYY-MM-DD
        }
        current.setDate(current.getDate() + 1);
    }
    return dates;
};

/**
 * POST /api/leaves — Create a new leave request (Admin files it)
 */
const createLeave = async (req, res) => {
    try {
        if (req.employeeRole !== 'admin') return res.status(403).json({ error: 'Admins only.' });

        const { employeeId, leaveType, startDate, endDate, reason } = req.body;
        if (!employeeId || !leaveType || !startDate || !endDate) {
            return res.status(400).json({ error: 'employeeId, leaveType, startDate, and endDate are required.' });
        }

        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ error: 'Employee not found.' });

        const dates = getBusinessDates(startDate, endDate);
        if (dates.length === 0) return res.status(400).json({ error: 'No valid working days in the selected range.' });

        // Check for duplicate leave in date range
        const existing = await Leave.findOne({
            employee: employeeId,
            status: { $ne: 'Rejected' },
            $or: [
                { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
            ]
        });
        if (existing) {
            return res.status(409).json({ error: 'A leave request already exists that overlaps with this date range.' });
        }

        const leave = await Leave.create({
            employee: employeeId,
            leaveType,
            startDate,
            endDate,
            totalDays: dates.length,
            reason: reason || ''
        });

        res.status(201).json({ message: 'Leave request filed.', leave });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/leaves/all — Fetch all leave records (Admin)
 */
const getAllLeaves = async (req, res) => {
    try {
        if (req.employeeRole !== 'admin') return res.status(403).json({ error: 'Admins only.' });

        const leaves = await Leave.find({})
            .populate('employee', 'fullName role leaveBalances')
            .populate('approvedBy', 'fullName')
            .sort({ createdAt: -1 });

        res.json(leaves);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * PATCH /api/leaves/:id/status — Approve or Reject a leave request
 */
const updateLeaveStatus = async (req, res) => {
    try {
        if (req.employeeRole !== 'admin') return res.status(403).json({ error: 'Admins only.' });

        const { status, adminRemarks } = req.body;
        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status must be Approved or Rejected.' });
        }

        const leave = await Leave.findById(req.params.id).populate('employee');
        if (!leave) return res.status(404).json({ error: 'Leave record not found.' });
        if (leave.status === 'Approved') return res.status(409).json({ error: 'This leave is already approved.' });

        const employee = leave.employee;
        const generatedIds = [];

        if (status === 'Approved' && leave.leaveType !== 'Unpaid Leave') {
            const dates = getBusinessDates(leave.startDate, leave.endDate);

            // Check and deduct leave balance
            const balanceKey = leave.leaveType === 'Sick Leave' ? 'sickLeave' : 'vacationLeave';
            const balance = employee.leaveBalances?.[balanceKey] || { allocated: 0, used: 0 };
            const remaining = balance.allocated - balance.used;

            if (remaining < dates.length) {
                return res.status(400).json({
                    error: `Insufficient ${leave.leaveType} balance. Available: ${remaining} day(s), Requested: ${dates.length} day(s).`
                });
            }

            // Deduct balance
            employee.leaveBalances[balanceKey].used += dates.length;
            await employee.save();

            // Generate one paid Attendance log per business day
            for (const dateStr of dates) {
                // Avoid duplicate (in case admin re-approves)
                const dup = await Attendance.findOne({ employee: employee._id, dateStr });
                if (dup) continue;

                const shiftStart = new Date(dateStr + 'T08:00:00');
                const shiftEnd = new Date(dateStr + 'T17:00:00');

                const att = await Attendance.create({
                    employee: employee._id,
                    dateStr,
                    clockInTime: shiftStart,
                    clockOutTime: shiftEnd,
                    durationMinutes: 480, // 8 hours
                    overtimeMinutes: 0,
                    isOTApproved: false,
                    holidayType: 'None',
                    holidayName: leave.leaveType, // Label so it's visible in attendance log
                    wasPresentYesterday: false,
                    isLeave: true,
                    leaveType: leave.leaveType
                });
                generatedIds.push(att._id);
            }
        }

        // If rejecting an already-approved leave, roll back balance and delete attendance
        if (status === 'Rejected' && leave.status === 'Approved' && leave.leaveType !== 'Unpaid Leave') {
            const balanceKey = leave.leaveType === 'Sick Leave' ? 'sickLeave' : 'vacationLeave';
            employee.leaveBalances[balanceKey].used = Math.max(0, (employee.leaveBalances[balanceKey].used || 0) - leave.totalDays);
            await employee.save();
            if (leave.generatedAttendanceIds?.length) {
                await Attendance.deleteMany({ _id: { $in: leave.generatedAttendanceIds } });
            }
        }

        leave.status = status;
        leave.adminRemarks = adminRemarks || '';
        leave.approvedBy = req.employeeId;
        if (generatedIds.length) leave.generatedAttendanceIds = generatedIds;

        await leave.save();
        res.json({ message: `Leave ${status}.`, leave });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * DELETE /api/leaves/:id — Delete a Pending leave request (Admin)
 */
const deleteLeave = async (req, res) => {
    try {
        if (req.employeeRole !== 'admin') return res.status(403).json({ error: 'Admins only.' });

        const leave = await Leave.findById(req.params.id).populate('employee');
        if (!leave) return res.status(404).json({ error: 'Leave record not found.' });

        // If it was approved and had paid leave logs, roll back
        if (leave.status === 'Approved' && leave.leaveType !== 'Unpaid Leave') {
            const employee = leave.employee;
            if (employee) {
                const balanceKey = leave.leaveType === 'Sick Leave' ? 'sickLeave' : 'vacationLeave';
                employee.leaveBalances[balanceKey].used = Math.max(0, (employee.leaveBalances[balanceKey].used || 0) - leave.totalDays);
                await employee.save();
            }
            if (leave.generatedAttendanceIds?.length) {
                await Attendance.deleteMany({ _id: { $in: leave.generatedAttendanceIds } });
            }
        }

        await Leave.findByIdAndDelete(req.params.id);
        res.json({ message: 'Leave record deleted.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * PATCH /api/leaves/:id/balances — Update employee leave balance allocations (Admin)
 */
const updateLeaveBalances = async (req, res) => {
    try {
        if (req.employeeRole !== 'admin') return res.status(403).json({ error: 'Admins only.' });
        const { employeeId, sickLeaveAllocated, vacationLeaveAllocated } = req.body;
        const emp = await Employee.findById(employeeId);
        if (!emp) return res.status(404).json({ error: 'Employee not found.' });

        if (sickLeaveAllocated !== undefined) {
            if (!emp.leaveBalances) emp.leaveBalances = { sickLeave: { allocated: 5, used: 0 }, vacationLeave: { allocated: 5, used: 0 } };
            emp.leaveBalances.sickLeave.allocated = Number(sickLeaveAllocated);
        }
        if (vacationLeaveAllocated !== undefined) {
            if (!emp.leaveBalances) emp.leaveBalances = { sickLeave: { allocated: 5, used: 0 }, vacationLeave: { allocated: 5, used: 0 } };
            emp.leaveBalances.vacationLeave.allocated = Number(vacationLeaveAllocated);
        }
        emp.markModified('leaveBalances');
        await emp.save();
        res.json({ message: 'Leave balances updated.', leaveBalances: emp.leaveBalances });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { createLeave, getAllLeaves, updateLeaveStatus, deleteLeave, updateLeaveBalances };
