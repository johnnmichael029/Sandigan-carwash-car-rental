const Revenue = require('../models/revenueModel');
const Expense = require('../models/expenseModel');
const Booking = require('../models/bookingModel');
const { getSettingValue } = require('./settingController');

/**
 * Generates an End-of-Month (EOM) financial forecast based on moving averages.
 * Calculates daily averages over the last 30 days, projects that forward for 
 * the remaining days of the current month, and adds it to the Month-to-Date (MTD) totals.
 */
const getForecast = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        const daysInMonth = endOfMonth.getDate();
        const currentDayOfMonth = now.getDate();
        const daysRemaining = daysInMonth - currentDayOfMonth;

        // 1. Fetch Month-to-Date (MTD) totals
        const mtdRevenuesAgg = await Revenue.aggregate([
            { $match: { date: { $gte: startOfMonth, $lte: now } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const mtdExpensesAgg = await Expense.aggregate([
            { $match: { date: { $gte: startOfMonth, $lte: now } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const mtdRevenue = mtdRevenuesAgg[0]?.total || 0;
        const mtdExpenseModel = mtdExpensesAgg[0]?.total || 0;

        const commissionRate = await getSettingValue('commission_rate', 0.30);

        // 1. Calculate MTD Commission (Split into Paid and Unpaid)
        const mtdBookings = await Booking.find({
            status: 'Completed',
            updatedAt: { $gte: startOfMonth, $lte: now }
        });
        
        let mtdTotalCommission = 0;
        let mtdUnpaidCommission = 0;
        
        mtdBookings.forEach(b => {
            const retailTotal = (b.purchasedProducts || []).reduce((s, p) => s + (Number(p.price || 0) * Number(p.quantity || 0)), 0);
            const comm = Math.max(0, (b.totalPrice || 0) - retailTotal) * commissionRate;
            mtdTotalCommission += comm;
            if (b.commissionStatus !== 'Paid') mtdUnpaidCommission += comm;
        });

        // Current MTD Expense = Everything in model (including paid salaries/comms) + Unpaid commissions
        const mtdExpenseFull = mtdExpenseModel + mtdUnpaidCommission;
        const mtdNetProfit = mtdRevenue - mtdExpenseFull;

        // 2. Fetch trailing 30-day totals for Velocity
        const thirtyDaysStart = new Date(thirtyDaysAgo);
        thirtyDaysStart.setHours(0, 0, 0, 0);

        const trailingRevenuesAgg = await Revenue.aggregate([
            { 
                $match: { 
                    $or: [
                        { date: { $gte: thirtyDaysStart, $lte: now } },
                        { createdAt: { $gte: thirtyDaysStart, $lte: now } }
                    ]
                } 
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const trailingRevenue = (trailingRevenuesAgg[0]?.total || 0);

        // A. Logged Overhead Velocity (Operations without Salaries)
        // Use $or to be safe across different date recording formats
        const trailingExpensesRaw = await Expense.find({
            $or: [
                { date: { $gte: thirtyDaysStart, $lte: now } },
                { createdAt: { $gte: thirtyDaysStart, $lte: now } }
            ]
        });
        
        const trailingOverhead = trailingExpensesRaw
            .filter(e => e.category !== 'Salaries')
            .reduce((sum, e) => sum + (e.amount || 0), 0);

        // B. Accruing Commission Velocity (Owed Labor speed from bookings)
        // Use 'updatedAt' to match the summary API logic (when the work was completed)
        const trailingBookings = await Booking.find({
            status: 'Completed',
            updatedAt: { $gte: thirtyDaysAgo, $lte: now }
        });
        
        // Final fallback for rate if needed
        const effectiveRate = Number(commissionRate) || 0.30;

        const trailingCommissionAccrued = trailingBookings.reduce((sum, b) => {
            const retailTotal = (b.purchasedProducts || []).reduce((s, p) => s + (Number(p.price || 0) * Number(p.quantity || 0)), 0);
            const commissionablePrice = Math.max(0, (b.totalPrice || 0) - retailTotal);
            const comm = commissionablePrice * effectiveRate;
            return sum + (comm || 0);
        }, 0);

        const dailyAvgRevenue = trailingRevenue / 30;
        // True Speed = (Other Costs) + (Real Labor Accrual Rate)
        const dailyAvgExpense = (trailingOverhead + trailingCommissionAccrued) / 30;

        // 3. Project for the remaining days
        const projectedFutureRevenue = dailyAvgRevenue * daysRemaining;
        const projectedFutureExpense = dailyAvgExpense * daysRemaining;

        // 4. Final EOM Projections
        const projectedEOMRevenue = mtdRevenue + projectedFutureRevenue;
        const projectedEOMExpense = mtdExpenseFull + projectedFutureExpense;
        const projectedEOMNetProfit = projectedEOMRevenue - projectedEOMExpense;

        res.status(200).json({
            currentDayOfMonth,
            daysRemaining,
            mtd: {
                revenue: mtdRevenue,
                expense: mtdExpenseFull,
                netProfit: mtdNetProfit
            },
            dailyAverages: {
                revenue: dailyAvgRevenue,
                expense: dailyAvgExpense
            },
            projectedEOM: {
                revenue: projectedEOMRevenue,
                expense: projectedEOMExpense,
                netProfit: projectedEOMNetProfit
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getForecast
};
