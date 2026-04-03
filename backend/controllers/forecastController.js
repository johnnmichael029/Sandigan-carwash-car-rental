const Revenue = require('../models/revenueModel');
const Expense = require('../models/expenseModel');

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
        const mtdExpense = mtdExpensesAgg[0]?.total || 0;
        const mtdNetProfit = mtdRevenue - mtdExpense;

        // 2. Fetch trailing 30-day totals to compute accurate daily averages
        const trailingRevenuesAgg = await Revenue.aggregate([
            { $match: { date: { $gte: thirtyDaysAgo, $lte: now } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const trailingExpensesAgg = await Expense.aggregate([
            { $match: { date: { $gte: thirtyDaysAgo, $lte: now } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const trailingRevenue = trailingRevenuesAgg[0]?.total || 0;
        const trailingExpense = trailingExpensesAgg[0]?.total || 0;

        const dailyAvgRevenue = trailingRevenue / 30;
        const dailyAvgExpense = trailingExpense / 30;

        // 3. Project for the remaining days of the month
        const projectedRemainingRevenue = dailyAvgRevenue * daysRemaining;
        const projectedRemainingExpense = dailyAvgExpense * daysRemaining;

        // 4. Calculate Final EOM Projections
        const projectedEOMRevenue = mtdRevenue + projectedRemainingRevenue;
        const projectedEOMExpense = mtdExpense + projectedRemainingExpense;
        const projectedEOMNetProfit = projectedEOMRevenue - projectedEOMExpense;

        res.status(200).json({
            currentDayOfMonth,
            daysRemaining,
            mtd: {
                revenue: mtdRevenue,
                expense: mtdExpense,
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
