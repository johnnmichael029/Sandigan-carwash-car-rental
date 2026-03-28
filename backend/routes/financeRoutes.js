const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { getExpenses, createExpense, deleteExpense } = require('../controllers/expenseController');
const { getSettings, updateSetting } = require('../controllers/settingController');
const Booking = require('../models/bookingModel');

// All finance routes are admin-protected
router.get('/expenses', requireAuth, getExpenses);
router.post('/expenses', requireAuth, createExpense);
router.delete('/expenses/:id', requireAuth, deleteExpense);

// Settings routes — GET all & POST (upsert) a setting
router.get('/settings', requireAuth, getSettings);
router.post('/settings', requireAuth, updateSetting);

// Special route for financial summary (Profit/Loss data)
router.get('/summary', requireAuth, async (req, res) => {
    try {
        const bookings = await Booking.find({ status: 'Completed' });
        const expenses = await (require('../models/expenseModel')).find();

        const { getSettingValue } = require('../controllers/settingController');
        const commissionRate = await getSettingValue('commission_rate', 0.30);

        // Calculate Revenue and Commissions
        const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        const totalCommissionOwed = bookings.reduce((sum, b) => {
            const comm = b.commission || (b.totalPrice * commissionRate);
            return sum + (comm || 0);
        }, 0);

        // Calculate Expenses (Overhead)
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        const netProfitBeforeTaxes = totalRevenue - totalCommissionOwed - totalExpenses;

        res.status(200).json({
            totalRevenue,
            totalCommissionOwed,
            totalExpenses,
            netProfit: netProfitBeforeTaxes,
            bookingCount: bookings.length,
            expenseCount: expenses.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
