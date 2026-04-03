const Employee = require('../models/employeeModel');
const Booking = require('../models/bookingModel');
const Attendance = require('../models/attendanceModel');
const Expense = require('../models/expenseModel');
const Payout = require('../models/payoutModel');
const { getSettingValue } = require('./settingController');
const { createLog } = require('./activityLogController');
const { calculatePhilHealth, calculateHDMF, calculateSSS, calculateWithholdingTax, calculateNightDiffMinutes } = require('../utils/payrollCalculator');

/**
 * GET /api/payroll/summary?period=today|week|month
 */
const getPayrollSummary = async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        // Build date range
        const now = new Date();
        let startDate;
        if (period === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        } else if (period === 'week') {
            const day = now.getDay();
            startDate = new Date(now);
            startDate.setDate(now.getDate() - day);
            startDate.setHours(0, 0, 0, 0);
        } else {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const detailers = await Employee.find({ role: 'detailer' }).lean();
        const bookings = await Booking.find({
            status: 'Completed',
            assignedTo: { $exists: true, $ne: null },
            updatedAt: { $gte: startDate }
        }).lean();

        const commissionRate = await getSettingValue('commission_rate', 0.30);

        const summaries = detailers.map(detailer => {
            const myBookings = bookings.filter(b =>
                b.assignedTo && b.assignedTo.toString() === detailer._id.toString()
            );

            const totalRevenue = myBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

            const calculateComm = (b) => {
                const retailTotal = (b.purchasedProducts || []).reduce((s, p) => s + (Number(p.price || 0) * Number(p.quantity || 0)), 0);
                const commissionablePrice = Math.max(0, (b.totalPrice || 0) - retailTotal);
                return (commissionablePrice * commissionRate);
            };

            const totalCommission = myBookings.reduce((sum, b) => sum + calculateComm(b), 0);
            const unpaidCommission = myBookings
                .filter(b => b.commissionStatus !== 'Paid')
                .reduce((sum, b) => sum + calculateComm(b), 0);

            return {
                detailer: {
                    _id: detailer._id,
                    fullName: detailer.fullName,
                    email: detailer.email,
                    role: detailer.role
                },
                bookingCount: myBookings.length,
                totalRevenue,
                totalCommission,
                unpaidCommission,
                bookings: myBookings.map(b => ({
                    _id: b._id,
                    batchId: b.batchId,
                    totalPrice: b.totalPrice,
                    commission: b.commission,
                    commissionStatus: b.commissionStatus,
                    serviceType: b.serviceType,
                    vehicleType: b.vehicleType,
                    updatedAt: b.updatedAt
                }))
            };
        });

        res.json({ period, startDate, summaries });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/payroll/mark-paid
 */
const markCommissionPaid = async (req, res) => {
    try {
        const { detailerId, period } = req.body;
        if (!detailerId) return res.status(400).json({ error: 'detailerId is required' });

        const now = new Date();
        let startDate;
        if (period === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        } else if (period === 'week') {
            const day = now.getDay();
            startDate = new Date(now);
            startDate.setDate(now.getDate() - day);
            startDate.setHours(0, 0, 0, 0);
        } else {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const unpaidBookings = await Booking.find({
            status: 'Completed',
            assignedTo: detailerId,
            commissionStatus: 'Unpaid',
            updatedAt: { $gte: startDate }
        });

        if (unpaidBookings.length === 0) {
            return res.status(400).json({ error: 'No unpaid commissions found for this period.' });
        }

        const commissionRate = await getSettingValue('commission_rate', 0.30);
        const totalPaid = unpaidBookings.reduce((sum, b) => {
            const retailTotal = (b.purchasedProducts || []).reduce((s, p) => s + (Number(p.price || 0) * Number(p.quantity || 0)), 0);
            const commissionablePrice = Math.max(0, (b.totalPrice || 0) - retailTotal);
            return sum + (commissionablePrice * commissionRate);
        }, 0);

        await Booking.updateMany(
            { _id: { $in: unpaidBookings.map(b => b._id) } },
            { $set: { commissionStatus: 'Paid' } }
        );

        const detailer = await Employee.findById(detailerId).lean();
        await Expense.create({
            title: `Payroll (Commission) — ${detailer?.fullName || 'Detailer'} (${period})`,
            category: 'Salaries',
            amount: totalPaid,
            description: `Commission payout for ${unpaidBookings.length} completed booking(s)`
        });

        await Payout.create({
            recipient: detailerId,
            basicPay: 0,
            grossPay: totalPaid,
            netAmount: totalPaid,
            itemsCount: unpaidBookings.length,
            period: period,
            paidBy: req.employeeId
        });

        // Audit Log
        const actorName = req.user ? req.user.fullName : (req.employeeId || 'Admin');
        createLog({
            actorId: req.user ? req.user.id : (req.employeeId || null),
            actorName: actorName,
            actorRole: req.user ? req.user.role : 'admin',
            module: 'HRIS',
            action: 'payout_processed',
            message: `Processed commission payout: ₱${totalPaid.toLocaleString()} to ${detailer?.fullName || 'Detailer'}`,
            meta: { recipient: detailerId, amount: totalPaid, bookingCount: unpaidBookings.length }
        });

        res.json({ message: `Marked ${unpaidBookings.length} booking(s) as Paid.`, totalPaid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/payroll/bulk-mark-paid
 */
const bulkMarkCommissionPaid = async (req, res) => {
    try {
        const { detailerIds, period } = req.body;
        if (!detailerIds || !Array.isArray(detailerIds)) return res.status(400).json({ error: 'detailerIds array is required' });

        const now = new Date();
        let startDate;
        if (period === 'today') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        else if (period === 'week') {
            const day = now.getDay();
            startDate = new Date(now);
            startDate.setDate(now.getDate() - day);
            startDate.setHours(0, 0, 0, 0);
        } else startDate = new Date(now.getFullYear(), now.getMonth(), 1);

        const commissionRate = await getSettingValue('commission_rate', 0.30);
        let totalProcessedCount = 0;

        for (const detailerId of detailerIds) {
            const unpaidBookings = await Booking.find({
                status: 'Completed',
                assignedTo: detailerId,
                commissionStatus: 'Unpaid',
                updatedAt: { $gte: startDate }
            });

            if (unpaidBookings.length > 0) {
                const totalPaid = unpaidBookings.reduce((sum, b) => {
                    const retailTotal = (b.purchasedProducts || []).reduce((s, p) => s + (Number(p.price || 0) * Number(p.quantity || 0)), 0);
                    const commissionablePrice = Math.max(0, (b.totalPrice || 0) - retailTotal);
                    return sum + (commissionablePrice * commissionRate);
                }, 0);

                await Booking.updateMany(
                    { _id: { $in: unpaidBookings.map(b => b._id) } },
                    { $set: { commissionStatus: 'Paid' } }
                );

                const detailer = await Employee.findById(detailerId).lean();
                await Expense.create({
                    title: `Payroll (Commission) — ${detailer?.fullName || 'Detailer'} (${period})`,
                    category: 'Salaries',
                    amount: totalPaid,
                    description: `Bulk commission payout for ${unpaidBookings.length} completed booking(s)`
                });

                await Payout.create({
                    recipient: detailerId,
                    basicPay: 0,
                    grossPay: totalPaid,
                    netAmount: totalPaid,
                    itemsCount: unpaidBookings.length,
                    period: period,
                    paidBy: req.employeeId
                });
                totalProcessedCount++;
            }
        }

        // Audit Log (Summary)
        if (totalProcessedCount > 0) {
            const actorName = req.user ? req.user.fullName : (req.employeeId || 'Admin');
            createLog({
                actorId: req.user ? req.user.id : (req.employeeId || null),
                actorName: actorName,
                actorRole: req.user ? req.user.role : 'admin',
                module: 'HRIS',
                action: 'bulk_commission_payout',
                message: `Bulk payout processed: Settled commissions for ${totalProcessedCount} detailer(s).`,
                meta: { count: totalProcessedCount }
            });
        }

        res.json({ message: `Successfully processed ${totalProcessedCount} detailers.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/payroll/pending-fixed
 * Returns detailed pending salary stats for fixed-salary staff
 */
const getPendingFixedSalary = async (req, res) => {
    try {
        const employees = await Employee.find({ role: { $ne: 'detailer' } }).lean();
        const now = new Date();

        const results = await Promise.all(employees.map(async (emp) => {
            if (!emp.baseSalary || emp.baseSalary <= 0) return null;

            // Determine Start Date for calculation (since last payout or start of cycle/hiring)
            let startDate = emp.lastPaidDate ? new Date(emp.lastPaidDate) : (emp.hiredDate ? new Date(emp.hiredDate) : new Date(now));

            // If No last payment AND no hiredDate (legacy), look back based on frequency
            if (!emp.lastPaidDate && !emp.hiredDate) {
                if (emp.salaryFrequency === 'Weekly') startDate.setDate(now.getDate() - 7);
                else if (emp.salaryFrequency === 'Bi-Weekly') startDate.setDate(now.getDate() - 14);
                else if (emp.salaryFrequency === 'Daily') startDate.setDate(now.getDate() - 1);
                else startDate.setDate(now.getDate() - 30);
            }
            startDate.setHours(0, 0, 0, 0);

            const logs = await Attendance.find({
                employee: emp._id,
                createdAt: { $gt: startDate }
            }).sort({ createdAt: 1 });

            // Divisors and Rates
            let divisor = 26; // Default Monthly
            if (emp.salaryFrequency === 'Bi-Weekly') divisor = 13;
            else if (emp.salaryFrequency === 'Weekly') divisor = 6;
            else if (emp.salaryFrequency === 'Daily') divisor = 1;

            const targetHours = divisor * 8;
            const dailyRate = emp.salaryFrequency === 'Daily' ? emp.baseSalary : (emp.baseSalary / divisor);
            const hourlyRate = dailyRate / 8;

            let totalRegMinutes = 0;
            let totalOTMinutes = 0;
            let totalNDMinutes = 0;
            let holidayPay = 0;
            let lateCount = 0;

            logs.forEach(log => {
                if (!log.clockInTime || !log.clockOutTime) return;
                const clockIn = new Date(log.clockInTime);
                const clockOut = new Date(log.clockOutTime);

                // --- NEW: PHASE-SPLIT CALCULATION ---
                let shiftEndMarker = new Date(clockIn);
                if (emp.shiftType === 'Morning') {
                    shiftEndMarker.setHours(17, 0, 0, 0);
                } else if (emp.shiftType === 'Night') {
                    shiftEndMarker.setHours(5, 0, 0, 0); // User specified: Starts 8PM, Ends 5AM
                    if (shiftEndMarker < clockIn) shiftEndMarker.setDate(shiftEndMarker.getDate() + 1);
                }

                let dayRegMins = 0;
                let dayOTMins = 0;

                if (emp.shiftType === 'Morning' || emp.shiftType === 'Night') {
                    // Regular Phase
                    if (clockIn < shiftEndMarker) {
                        const regEnd = clockOut < shiftEndMarker ? clockOut : shiftEndMarker;
                        dayRegMins = Math.floor((regEnd - clockIn) / 60000);
                    }
                    // OT Phase
                    if (log.isOTApproved && clockOut > shiftEndMarker) {
                        const otStart = clockIn > shiftEndMarker ? clockIn : shiftEndMarker;
                        dayOTMins = Math.floor((clockOut - otStart) / 60000);
                    }
                } else {
                    // Default/None: Everything up to 8h is regular
                    const duration = log.durationMinutes || 0;
                    dayRegMins = Math.min(duration, 480);
                    if (log.isOTApproved) dayOTMins = Math.max(0, duration - 480);
                }

                // --- NIGHT DIFFERENTIAL ---
                const ndMins = calculateNightDiffMinutes(clockIn, clockOut);
                totalNDMinutes += ndMins;

                // --- SMART BREAK DEDUCTION ---
                // ONLY deduct if they were clocked in BEFORE break start and stayed PAST break end
                if (emp.shiftType === 'Morning') {
                    const noon = new Date(clockIn); noon.setHours(12, 0, 0, 0);
                    const onePM = new Date(clockIn); onePM.setHours(13, 0, 0, 0);
                    if (clockIn < noon && clockOut > onePM) dayRegMins = Math.max(0, dayRegMins - 60);
                } else if (emp.shiftType === 'Night') {
                    const midnight = new Date(clockIn); 
                    midnight.setHours(24, 0, 0, 0); // 12:00 AM (Next Day)
                    const oneAM = new Date(clockIn); 
                    oneAM.setHours(25, 0, 0, 0);    // 1:00 AM (Next Day)
                    if (clockIn < midnight && clockOut > oneAM) dayRegMins = Math.max(0, dayRegMins - 60);
                }

                totalRegMinutes += dayRegMins;
                totalOTMinutes += dayOTMins;

                // Late Logic
                if (emp.shiftStartTime) {
                    try {
                        const [timePart, modifier] = emp.shiftStartTime.split(' ');
                        let [h, m] = timePart.split(':').map(Number);
                        if (modifier === 'PM' && h < 12) h += 12;
                        if (modifier === 'AM' && h === 12) h = 0;
                        const shiftStartDate = new Date(clockIn);
                        shiftStartDate.setHours(h, m, 0, 0);
                        const graceThreshold = new Date(shiftStartDate.getTime() + 5 * 60000);
                        if (clockIn > graceThreshold) lateCount++;
                    } catch (e) {}
                }

                // Holiday logic (on Regular Phase)
                if (log.holidayType && log.holidayType !== 'None' && log.wasPresentYesterday) {
                    if (log.holidayType === 'Regular') holidayPay += ((dayRegMins / 60) * hourlyRate);
                    else if (log.holidayType === 'Special') holidayPay += (((dayRegMins / 60) * hourlyRate) * 0.30);
                }
            });

            // Calculate Accruals
            const accruedBase = (totalRegMinutes / 480) * dailyRate; 
            const otPay = (totalOTMinutes / 60) * hourlyRate * 1.30;
            const nightDiffPay = (totalNDMinutes / 60) * hourlyRate * 0.10;

            // Predicted Deductions (For Preview)
            const sss = calculateSSS(accruedBase);
            const ph = calculatePhilHealth(accruedBase);
            const hdmf = calculateHDMF(accruedBase);
            const grossTaxable = accruedBase + holidayPay + otPay + nightDiffPay;
            const totalMandatoryEE = sss.employee + ph.employee + hdmf.employee;
            const predictedTax = calculateWithholdingTax(grossTaxable - totalMandatoryEE);
            const totalDeductions = totalMandatoryEE + predictedTax;
            const netAmount = grossTaxable + (emp.nonTaxableAllowance || 0) - totalDeductions;

            return {
                _id: emp._id,
                fullName: emp.fullName,
                role: emp.role,
                baseSalary: emp.baseSalary, // This is the 'Potential' or 'Goal' for the cycle
                accruedBase,
                frequency: emp.salaryFrequency,
                lastPaidDate: emp.lastPaidDate,
                hiredDate: emp.hiredDate,
                logs: (logs || []).map(l => {
                    // Recalculate phases for the frontend display
                    const cIn = new Date(l.clockInTime);
                    const cOut = new Date(l.clockOutTime);
                    let sEnd = new Date(cIn);
                    if (emp.shiftType === 'Morning') sEnd.setHours(17, 0, 0, 0);
                    else if (emp.shiftType === 'Night') {
                        sEnd.setHours(5, 0, 0, 0);
                        if (sEnd < cIn) sEnd.setDate(sEnd.getDate() + 1);
                    }

                    let rM = 0;
                    let oM = 0;
                    if (emp.shiftType === 'Morning' || emp.shiftType === 'Night') {
                        if (cIn < sEnd) {
                            const rE = cOut < sEnd ? cOut : sEnd;
                            rM = Math.floor((rE - cIn) / 60000);
                        }
                        if (l.isOTApproved && cOut > sEnd) {
                            const oS = cIn > sEnd ? cIn : sEnd;
                            oM = Math.floor((cOut - oS) / 60000);
                        }
                    } else {
                        const dur = l.durationMinutes || 0;
                        rM = Math.min(dur, 480);
                        if (l.isOTApproved) oM = Math.max(0, dur - 480);
                    }

                    // Lunch break 12-1 PM
                    const noon = new Date(cIn); noon.setHours(12, 0, 0, 0);
                    const onePM = new Date(cIn); onePM.setHours(13, 0, 0, 0);
                    if (cIn < noon && cOut > onePM) rM = Math.max(0, rM - 60);

                    return {
                        _id: l._id,
                        dateStr: l.dateStr,
                        clockInTime: l.clockInTime,
                        clockOutTime: l.clockOutTime,
                        durationMinutes: l.durationMinutes,
                        holidayType: l.holidayType,
                        holidayName: l.holidayName,
                        isOTApproved: l.isOTApproved,
                        overtimeMinutes: l.overtimeMinutes,
                        regMinutes: rM,
                        otMinutes: oM,
                        wasPresentYesterday: l.wasPresentYesterday
                    };
                }),
                stats: {
                    totalHours: (totalRegMinutes / 60).toFixed(1), // ONLY regular hours count for cycle quota
                    targetHours,
                    otHours: (totalOTMinutes / 60).toFixed(1),
                    otPay,
                    ndHours: (totalNDMinutes / 60).toFixed(1),
                    ndPay: nightDiffPay,
                    holidayPay,
                    lateCount,
                    // New Predictions
                    sssEE: sss.employee,
                    philhealthEE: ph.employee,
                    hdmfEE: hdmf.employee,
                    withholdingTax: predictedTax,
                    totalDeductions
                },
                netAmount
            };
        }));

        res.json(results.filter(r => r !== null));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/payroll/pay-salary
 */
const payFixedSalary = async (req, res) => {
    try {
        const { employeeId, bonus = 0, deductions = 0, adjustmentRemarks = '' } = req.body;
        if (!employeeId) return res.status(400).json({ error: 'Employee ID required' });

        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        // Use the calculation logic similar to getPending
        const now = new Date();
        let startDate = employee.lastPaidDate ? new Date(employee.lastPaidDate) : (employee.hiredDate ? new Date(employee.hiredDate) : new Date(now));
        if (!employee.lastPaidDate && !employee.hiredDate) {
            if (employee.salaryFrequency === 'Weekly') startDate.setDate(now.getDate() - 7);
            else if (employee.salaryFrequency === 'Bi-Weekly') startDate.setDate(now.getDate() - 14);
            else startDate.setDate(now.getDate() - 30);
        }
        startDate.setHours(0, 0, 0, 0);

        const logs = await Attendance.find({ employee: employeeId, createdAt: { $gt: startDate } });

        let divisor = 26;
        if (employee.salaryFrequency === 'Bi-Weekly') divisor = 13;
        else if (employee.salaryFrequency === 'Weekly') divisor = 6;
        else if (employee.salaryFrequency === 'Daily') divisor = 1;

        const dailyRate = employee.salaryFrequency === 'Daily' ? employee.baseSalary : (employee.baseSalary / divisor);
        const hourlyRate = dailyRate / 8;

        let totalRegMinutes = 0;
        let totalOTMinutes = 0;
        let totalNDMinutes = 0;
        let holidayPay = 0;
        let otPay = 0;

        logs.forEach(log => {
            if (!log.clockInTime || !log.clockOutTime) return;
            const clockIn = new Date(log.clockInTime);
            const clockOut = new Date(log.clockOutTime);

            let shiftEndMarker = new Date(clockIn);
            if (employee.shiftType === 'Morning') shiftEndMarker.setHours(17, 0, 0, 0);
            else if (employee.shiftType === 'Night') {
                shiftEndMarker.setHours(5, 0, 0, 0); // User specified: Starts 8PM, Ends 5AM
                if (shiftEndMarker < clockIn) shiftEndMarker.setDate(shiftEndMarker.getDate() + 1);
            }

            let dayRegMins = 0;
            let dayOTMins = 0;

            if (employee.shiftType === 'Morning' || employee.shiftType === 'Night') {
                if (clockIn < shiftEndMarker) {
                    const regEnd = clockOut < shiftEndMarker ? clockOut : shiftEndMarker;
                    dayRegMins = Math.floor((regEnd - clockIn) / 60000);
                }
                if (log.isOTApproved && clockOut > shiftEndMarker) {
                    const otStart = clockIn > shiftEndMarker ? clockIn : shiftEndMarker;
                    dayOTMins = Math.floor((clockOut - otStart) / 60000);
                }
            } else {
                const duration = log.durationMinutes || 0;
                dayRegMins = Math.min(duration, 480);
                if (log.isOTApproved) dayOTMins = Math.max(0, duration - 480);
            }

            // --- NIGHT DIFFERENTIAL ---
            totalNDMinutes += calculateNightDiffMinutes(clockIn, clockOut);

            // --- SMART BREAK DEDUCTION ---
            if (employee.shiftType === 'Morning') {
                const noon = new Date(clockIn); noon.setHours(12, 0, 0, 0);
                const onePM = new Date(clockIn); onePM.setHours(13, 0, 0, 0);
                if (clockIn < noon && clockOut > onePM) dayRegMins = Math.max(0, dayRegMins - 60);
            } else if (employee.shiftType === 'Night') {
                const midnight = new Date(clockIn); 
                midnight.setHours(24, 0, 0, 0); 
                const oneAM = new Date(clockIn); 
                oneAM.setHours(25, 0, 0, 0);
                if (clockIn < midnight && clockOut > oneAM) dayRegMins = Math.max(0, dayRegMins - 60);
            }

            totalRegMinutes += dayRegMins;
            totalOTMinutes += dayOTMins;

            if (log.holidayType && log.holidayType !== 'None' && log.wasPresentYesterday) {
                if (log.holidayType === 'Regular') holidayPay += ((dayRegMins / 60) * hourlyRate);
                else if (log.holidayType === 'Special') holidayPay += (((dayRegMins / 60) * hourlyRate) * 0.30);
            }
        });

        otPay = (totalOTMinutes / 60) * hourlyRate * 1.30;
        const nightDiffPay = (totalNDMinutes / 60) * hourlyRate * 0.10;
        const accruedBase = (totalRegMinutes / 480) * dailyRate; 


        // Automated Deductions
        const sss = calculateSSS(accruedBase);
        const ph = calculatePhilHealth(accruedBase);
        const hdmf = calculateHDMF(accruedBase);

        // Taxable Income Breakdown
        const grossTaxable = accruedBase + holidayPay + otPay + nightDiffPay;
        const totalMandatoryEE = sss.employee + ph.employee + hdmf.employee;
        const withholdingTax = calculateWithholdingTax(grossTaxable - totalMandatoryEE);

        const grossPay = grossTaxable + Number(bonus) + (employee.nonTaxableAllowance || 0);
        const totalDeductions = totalMandatoryEE + withholdingTax + Number(deductions);
        const netAmount = grossPay - totalDeductions;

        await Expense.create({
            title: `Salary — ${employee.fullName} (${employee.salaryFrequency || 'Monthly'})`,
            category: 'Salaries',
            amount: netAmount,
            description: `Basic: ₱${accruedBase.toFixed(2)} | NT Allowance: ₱${employee.nonTaxableAllowance || 0} | Managed Deductions: ₱${totalDeductions.toFixed(2)}`
        });

        await Payout.create({
            recipient: employee._id,
            basicPay: accruedBase,
            overtimeHours: (totalOTMinutes / 60),
            overtimePay: otPay,
            nightDiffHours: (totalNDMinutes / 60),
            nightDiffPay: nightDiffPay,
            holidayPay: holidayPay,
            bonuses: Number(bonus),
            allowances: employee.nonTaxableAllowance || 0,
            grossPay: grossPay,

            sssEE: sss.employee,
            philhealthEE: ph.employee,
            hdmfEE: hdmf.employee,
            withholdingTax: withholdingTax,
            totalDeductions: totalDeductions,

            sssER: sss.employer,
            philhealthER: ph.employer,
            hdmfER: hdmf.employer,

            netAmount: netAmount,
            period: `${employee.salaryFrequency || 'Monthly'} Cycle`,
            paidBy: req.employeeId
        });

        // Audit Log
        const actorName = req.user ? req.user.fullName : (req.employeeId || 'Admin');
        createLog({
            actorId: req.user ? req.user.id : (req.employeeId || null),
            actorName: actorName,
            actorRole: req.user ? req.user.role : 'admin',
            module: 'HRIS',
            action: 'salary_paid',
            message: `Processed salary payment: ₱${netAmount.toLocaleString()} to ${employee.fullName}`,
            meta: { recipient: employee._id, amount: netAmount, role: employee.role }
        });

        employee.lastPaidDate = new Date();
        await employee.save();

        res.json({ message: `Successfully logged salary payment for ${employee.fullName}`, amount: netAmount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/payroll/bulk-pay-salary
 */
const bulkPayFixedSalary = async (req, res) => {
    try {
        const { employeeIds } = req.body;
        if (!employeeIds || !Array.isArray(employeeIds)) return res.status(400).json({ error: 'employeeIds array required' });

        let processedCount = 0;
        const now = new Date();

        for (const employeeId of employeeIds) {
            const employee = await Employee.findById(employeeId);
            if (!employee) continue;

            let startDate = employee.lastPaidDate ? new Date(employee.lastPaidDate) : (employee.hiredDate ? new Date(employee.hiredDate) : new Date(now));
            startDate.setHours(0, 0, 0, 0);

            const logs = await Attendance.find({ employee: employeeId, createdAt: { $gt: startDate } });
            if (logs.length === 0 && !employee.hiredDate) continue; // Skip if no work and new employee

            let divisor = 26;
            if (employee.salaryFrequency === 'Bi-Weekly') divisor = 13;
            else if (employee.salaryFrequency === 'Weekly') divisor = 6;
            else if (employee.salaryFrequency === 'Daily') divisor = 1;

            const dailyRate = employee.salaryFrequency === 'Daily' ? employee.baseSalary : (employee.baseSalary / divisor);
            const hourlyRate = dailyRate / 8;

            let totalRegMinutes = 0;
            let totalOTMinutes = 0;
            let totalNDMinutes = 0;
            let holidayPay = 0;
            let otPay = 0;
            let nightDiffPay = 0;

            logs.forEach(log => {
                if (!log.clockInTime || !log.clockOutTime) return;
                const clockIn = new Date(log.clockInTime);
                const clockOut = new Date(log.clockOutTime);

                let shiftEndMarker = new Date(clockIn);
                if (employee.shiftType === 'Morning') shiftEndMarker.setHours(17, 0, 0, 0);
                else if (employee.shiftType === 'Night') {
                    shiftEndMarker.setHours(5, 0, 0, 0); // User specified: Starts 8PM, Ends 5AM
                    if (shiftEndMarker < clockIn) shiftEndMarker.setDate(shiftEndMarker.getDate() + 1);
                }

                let dayRegMins = 0;
                let dayOTMins = 0;

                if (employee.shiftType === 'Morning' || employee.shiftType === 'Night') {
                    if (clockIn < shiftEndMarker) {
                        const regEnd = clockOut < shiftEndMarker ? clockOut : shiftEndMarker;
                        dayRegMins = Math.floor((regEnd - clockIn) / 60000);
                    }
                    if (log.isOTApproved && clockOut > shiftEndMarker) {
                        const otStart = clockIn > shiftEndMarker ? clockIn : shiftEndMarker;
                        dayOTMins = Math.floor((clockOut - otStart) / 60000);
                    }
                } else {
                    const duration = log.durationMinutes || 0;
                    dayRegMins = Math.min(duration, 480);
                    if (log.isOTApproved) dayOTMins = Math.max(0, duration - 480);
                }

                // --- NIGHT DIFFERENTIAL ---
                totalNDMinutes += calculateNightDiffMinutes(clockIn, clockOut);

                // --- SMART BREAK DEDUCTION ---
                if (employee.shiftType === 'Morning') {
                    const noon = new Date(clockIn); noon.setHours(12, 0, 0, 0);
                    const onePM = new Date(clockIn); onePM.setHours(13, 0, 0, 0);
                    if (clockIn < noon && clockOut > onePM) dayRegMins = Math.max(0, dayRegMins - 60);
                } else if (employee.shiftType === 'Night') {
                    const midnight = new Date(clockIn); 
                    midnight.setHours(24, 0, 0, 0); 
                    const oneAM = new Date(clockIn); 
                    oneAM.setHours(25, 0, 0, 0);
                    if (clockIn < midnight && clockOut > oneAM) dayRegMins = Math.max(0, dayRegMins - 60);
                }

                totalRegMinutes += dayRegMins;
                totalOTMinutes += dayOTMins;

                if (log.holidayType && log.holidayType !== 'None' && log.wasPresentYesterday) {
                    if (log.holidayType === 'Regular') holidayPay += ((dayRegMins / 60) * hourlyRate);
                    else if (log.holidayType === 'Special') holidayPay += (((dayRegMins / 60) * hourlyRate) * 0.30);
                }
            });

            otPay = (totalOTMinutes / 60) * hourlyRate * 1.30;
            nightDiffPay = (totalNDMinutes / 60) * hourlyRate * 0.10;
            const accruedBase = (totalRegMinutes / 480) * dailyRate; 


            const sss = calculateSSS(accruedBase);
            const ph = calculatePhilHealth(accruedBase);
            const hdmf = calculateHDMF(accruedBase);
            const grossTaxable = accruedBase + holidayPay + otPay + nightDiffPay;
            const totalMandatoryEE = sss.employee + ph.employee + hdmf.employee;
            const withholdingTax = calculateWithholdingTax(grossTaxable - totalMandatoryEE);

            const grossPay = grossTaxable + (employee.nonTaxableAllowance || 0);
            const totalDeductions = totalMandatoryEE + withholdingTax;
            const netAmount = grossPay - totalDeductions;

            if (netAmount <= 0 && logs.length === 0) continue; // Defensive skip

            await Expense.create({
                title: `Salary (Bulk) — ${employee.fullName} (${employee.salaryFrequency || 'Monthly'})`,
                category: 'Salaries',
                amount: netAmount,
                description: `Bulk processing recorded via admin dashboard.`
            });

            await Payout.create({
                recipient: employee._id,
                basicPay: accruedBase,
                overtimeHours: (totalOTMinutes / 60),
                overtimePay: otPay,
                nightDiffHours: (totalNDMinutes / 60),
                nightDiffPay,
                holidayPay,
                bonuses: 0,
                allowances: employee.nonTaxableAllowance || 0,
                grossPay,
                sssEE: sss.employee,
                philhealthEE: ph.employee,
                hdmfEE: hdmf.employee,
                withholdingTax,
                totalDeductions,
                sssER: sss.employer,
                philhealthER: ph.employer,
                hdmfER: hdmf.employer,
                netAmount,
                period: `${employee.salaryFrequency || 'Monthly'} Cycle`,
                paidBy: req.employeeId
            });

            employee.lastPaidDate = new Date();
            await employee.save();
            processedCount++;
        }

        // Audit Log (Summary)
        if (processedCount > 0) {
            const actorName = req.user ? req.user.fullName : (req.employeeId || 'Admin');
            createLog({
                actorId: req.user ? req.user.id : (req.employeeId || null),
                actorName: actorName,
                actorRole: req.user ? req.user.role : 'admin',
                module: 'HRIS',
                action: 'bulk_salary_paid',
                message: `Bulk payroll processed: Paid salary for ${processedCount} employee(s).`,
                meta: { count: processedCount }
            });
        }

        res.json({ message: `Successfully processed ${processedCount} employees.`, processedCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/payroll/history
 */
const getPayoutHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        let query = {};

        // If search provided, we need to filter by recipient/detailer name
        // Since these are IDs, we use $lookup or find matching employee IDs first
        if (search) {
            const Employee = require('../models/employeeModel');
            const matchingEmps = await Employee.find({ 
                fullName: { $regex: search, $options: 'i' } 
            }).select('_id');
            
            const empIds = matchingEmps.map(e => e._id);
            query = {
                $or: [
                    { recipient: { $in: empIds } },
                    { detailer: { $in: empIds } }
                ]
            };
        }

        const history = await Payout.find(query)
            .populate('recipient', 'fullName email sssNo tinNo philhealthNo pagibigNo role')
            .populate('detailer', 'fullName email role')
            .populate('paidBy', 'fullName role')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const totalItems = await Payout.countDocuments(query);

        res.json({
            history,
            total: totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: Number(page)
        });
    } catch (err) {
        console.error('getPayoutHistory error:', err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getPayrollSummary,
    markCommissionPaid,
    payFixedSalary,
    getPayoutHistory,
    getPendingFixedSalary,
    bulkMarkCommissionPaid,
    bulkPayFixedSalary
};
