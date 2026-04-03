const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const { getExpenses, createExpense, deleteExpense } = require('../controllers/expenseController');
const { getSettings, updateSetting } = require('../controllers/settingController');
const Booking = require('../models/bookingModel');

// All finance routes are admin-protected
router.get('/expenses', requireAuth, adminOnly, getExpenses);
router.post('/expenses', requireAuth, adminOnly, createExpense);
router.delete('/expenses/:id', requireAuth, adminOnly, deleteExpense);

// Settings routes — GET all & POST (upsert) a setting
router.get('/settings', requireAuth, adminOnly, getSettings);
router.post('/settings', requireAuth, adminOnly, updateSetting);

// Special route for financial summary (Profit/Loss data)
router.get('/summary', requireAuth, adminOnly, async (req, res) => {
    try {
        const { period = 'all' } = req.query;

        // Build date range
        let startDate = null;
        if (period !== 'all') {
            const now = new Date();
            if (period === 'today') {
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            } else if (period === 'week') {
                const day = now.getDay();
                startDate = new Date(now);
                startDate.setDate(now.getDate() - day);
                startDate.setHours(0, 0, 0, 0);
            } else if (period === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            } else if (period === 'year') {
                startDate = new Date(now.getFullYear(), 0, 1);
            }
        }

        const query = startDate ? { updatedAt: { $gte: startDate } } : {};
        const bookings = await Booking.find({ 
            status: 'Completed',
            ...query
        });

        const Expense = require('../models/expenseModel');
        const expenseQuery = startDate ? { date: { $gte: startDate } } : {};
        const expenses = await Expense.find(expenseQuery);

        const AccountPayable = require('../models/payableModel');
        const payables = await AccountPayable.find({ status: { $ne: 'Paid' } });
        const totalPayables = payables.reduce((sum, p) => sum + (p.balanceOwed || 0), 0);

        const { getSettingValue } = require('../controllers/settingController');
        const commissionRate = await getSettingValue('commission_rate', 0.30);

        // Calculate Revenue
        const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

        // Calculate commissions that are strictly OWED (Unpaid)
        // We only show UNPAID because already-paid commissions are already in 'totalExpenses'
        const totalCommissionOwed = bookings
            .filter(b => b.commissionStatus === 'Unpaid')
            .reduce((sum, b) => {
                const retailTotal = (b.purchasedProducts || []).reduce((s, p) => s + (Number(p.price || 0) * Number(p.quantity || 0)), 0);
                const commissionablePrice = Math.max(0, (b.totalPrice || 0) - retailTotal);
                const comm = commissionablePrice * commissionRate;
                return sum + (comm || 0);
            }, 0);

        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        // Net Profit = Revenue - Spent Expenses - Unpaid Commissions
        const netProfit = totalRevenue - totalExpenses - totalCommissionOwed;

        res.status(200).json({
            totalRevenue,
            totalCommissionOwed,
            totalExpenses,
            totalPayables,
            netProfit,
            period,
            bookingCount: bookings.length,
            expenseCount: expenses.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
