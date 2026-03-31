const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const Employee = require('../models/employeeModel');
const Booking = require('../models/bookingModel');

/**
 * GET /api/payroll/summary?period=today|week|month
 * Returns per-detailer commission summaries for the given period.
 */
router.get('/summary', requireAuth, async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        // Build date range
        const now = new Date();
        let startDate;
        if (period === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        } else if (period === 'week') {
            const day = now.getDay(); // 0 = Sunday
            startDate = new Date(now);
            startDate.setDate(now.getDate() - day);
            startDate.setHours(0, 0, 0, 0);
        } else {
            // Default: month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // Get all detailers
        const detailers = await Employee.find({ role: 'detailer' }).lean();

        // Get completed bookings in period that have an assignedTo detailer
        const bookings = await Booking.find({
            status: 'Completed',
            assignedTo: { $exists: true, $ne: null },
            updatedAt: { $gte: startDate }
        }).lean();

        // Build per-detailer summary
        const { getSettingValue } = require('../controllers/settingController');
        const commissionRate = await getSettingValue('commission_rate', 0.30);

        const summaries = detailers.map(detailer => {
            const myBookings = bookings.filter(b =>
                b.assignedTo && b.assignedTo.toString() === detailer._id.toString()
            );

            // Re-calculate commissions on-the-fly to exclude products (Fixes inflated commissions)
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
});

/**
 * POST /api/payroll/mark-paid
 * Mark all unpaid commissions for a detailer as Paid, and record an expense.
 */
router.post('/mark-paid', requireAuth, async (req, res) => {
    try {
        const { detailerId, period } = req.body;
        if (!detailerId) return res.status(400).json({ error: 'detailerId is required' });

        // Build date range (same logic as above)
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

        // Find unpaid bookings for this detailer in this period
        const unpaidBookings = await Booking.find({
            status: 'Completed',
            assignedTo: detailerId,
            commissionStatus: 'Unpaid',
            updatedAt: { $gte: startDate }
        });

        if (unpaidBookings.length === 0) {
            return res.status(400).json({ error: 'No unpaid commissions found for this period.' });
        }

        const { getSettingValue } = require('../controllers/settingController');
        const commissionRate = await getSettingValue('commission_rate', 0.30);

        const totalPaid = unpaidBookings.reduce((sum, b) => {
            const retailTotal = (b.purchasedProducts || []).reduce((s, p) => s + (Number(p.price || 0) * Number(p.quantity || 0)), 0);
            const commissionablePrice = Math.max(0, (b.totalPrice || 0) - retailTotal);
            return sum + (commissionablePrice * commissionRate);
        }, 0);

        // Mark all as Paid
        await Booking.updateMany(
            { _id: { $in: unpaidBookings.map(b => b._id) } },
            { $set: { commissionStatus: 'Paid' } }
        );

        // Record as payroll expense in Finance
        const Expense = require('../models/expenseModel');
        const detailer = await Employee.findById(detailerId).lean();
        await Expense.create({
            title: `Payroll — ${detailer?.fullName || 'Detailer'} (${period})`,
            category: 'Salaries',
            amount: totalPaid,
            description: `Commission payout for ${unpaidBookings.length} completed booking(s)`
        });

        // Record into definitive Payout Ledger for detailers
        const Payout = require('../models/payoutModel');
        const newPayout = await Payout.create({
            detailer: detailerId,
            amount: totalPaid,
            itemsCount: unpaidBookings.length,
            period: period,
            paidBy: req.employeeId // Automatically inferred from verify token
        });

        res.json({
            message: `Marked ${unpaidBookings.length} booking(s) as Paid.`,
            totalPaid,
            bookingCount: unpaidBookings.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/payroll/pay-salary
 * Logs a standard salary payment for a regular employee/admin
 */
router.post('/pay-salary', requireAuth, async (req, res) => {
    try {
        const { employeeId } = req.body;
        if (!employeeId) return res.status(400).json({ error: 'Employee ID required' });
        
        const Employee = require('../models/employeeModel');
        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });
        if (!employee.baseSalary || employee.baseSalary <= 0) {
            return res.status(400).json({ error: 'Employee does not have a configured base salary.' });
        }
        
        // Record as payroll expense in Finance
        const Expense = require('../models/expenseModel');
        await Expense.create({
            title: `Salary — ${employee.fullName} (${employee.salaryFrequency || 'Monthly'})`,
            category: 'Salaries',
            amount: employee.baseSalary,
            description: `Fixed salary payout for ${employee.role}`
        });

        // Record into definitive Payout Ledger
        const Payout = require('../models/payoutModel');
        await Payout.create({
            detailer: employee._id, // Generically used for employee ID
            amount: employee.baseSalary,
            itemsCount: 0, // 0 signifies it's fixed salary, not per-vehicle commission
            period: employee.salaryFrequency || 'Monthly',
            paidBy: req.employeeId // Added to track admin who authorized
        });
        
        // Update employee last paid date
        employee.lastPaidDate = new Date();
        await employee.save();

        res.json({ message: `Successfully logged fixed salary payment for ${employee.fullName}`, amount: employee.baseSalary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/payroll/history
 * Returns the ledger of all past payments to detailers
 */
router.get('/history', requireAuth, async (req, res) => {
    try {
        const Payout = require('../models/payoutModel');
        const history = await Payout.find()
            .populate('detailer', 'fullName email')
            .populate('paidBy', 'fullName role')
            .sort({ createdAt: -1 })
            .limit(50); // Get latest 50 payouts for view

        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
