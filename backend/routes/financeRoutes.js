const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const { getExpenses, createExpense, deleteExpense } = require('../controllers/expenseController');
const { getSettings, updateSetting } = require('../controllers/settingController');
const Booking = require('../models/bookingModel');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateFinance = (req, res, next) => { invalidatePrefixes('finance', 'forecast', 'sandi'); next(); };

// Expenses — cached 60s
router.get('/expenses', requireAuth, adminOnly, cache('finance', 60), getExpenses);
router.post('/expenses', requireAuth, adminOnly, invalidateFinance, createExpense);
router.delete('/expenses/:id', requireAuth, adminOnly, invalidateFinance, deleteExpense);

// Finance settings — cached 5 min (commission rate rarely changes)
router.get('/settings', requireAuth, adminOnly, cache('finance', 300), getSettings);
router.post('/settings', requireAuth, adminOnly, invalidateFinance, updateSetting);

// Financial summary — cached 60s (runs 4 DB queries; most-hit endpoint in Finance tab)
router.get('/summary', requireAuth, adminOnly, cache('finance', 60), async (req, res) => {
    try {
        const { period = 'all', from, to } = req.query;

        // Build date range
        let startDate = null;
        let endDate = null;

        if (from && to) {
            startDate = new Date(from);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(to);
            endDate.setHours(23, 59, 59, 999);
        } else if (period !== 'all') {
            const now = new Date();
            endDate = new Date(); // Current time for relative periods
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

        const query = {};
        if (startDate) query.$gte = startDate;
        if (endDate) query.$lte = endDate;

        const mainQuery = Object.keys(query).length > 0 ? { date: query } : {};
        const bookingDateQuery = Object.keys(query).length > 0 ? { updatedAt: query } : {};
        
        const Revenue = require('../models/revenueModel');
        const [bookings, revenues] = await Promise.all([
            Booking.find({ 
                status: 'Completed',
                ...bookingDateQuery
            }),
            Revenue.find(mainQuery)
        ]);

        const Expense = require('../models/expenseModel');
        const expenses = await Expense.find(mainQuery);

        const AccountPayable = require('../models/payableModel');
        const payables = await AccountPayable.find({ status: { $ne: 'Paid' } });
        const totalPayables = payables.reduce((sum, p) => sum + (p.balanceOwed || 0), 0);

        const { getSettingValue } = require('../controllers/settingController');
        const commissionRate = await getSettingValue('commission_rate', 0.30);

        // Calculate Revenue from the master Revenue model (includes bookings, rentals, retail)
        const totalRevenue = revenues.reduce((sum, r) => sum + (r.amount || 0), 0);

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
