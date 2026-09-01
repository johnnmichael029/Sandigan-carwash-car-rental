const Booking = require('../models/bookingModel');
const RentalBooking = require('../models/carRentalModel');
const Attendance = require('../models/attendanceModel');
const Product = require('../models/productModel');
const Revenue = require('../models/revenueModel');
const Expense = require('../models/expenseModel');
const Employee = require('../models/employeeModel');

/**
 * GET /api/sandi/insights
 * Aggregates business data for the AI Admin Assistant (Sandi)
 */
const getSandiInsights = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        // 1. FINANCES: Today's Revenue & Monthly Pulse
        const [todayRev, monthRev, monthExp] = await Promise.all([
            Revenue.aggregate([
                { $match: { date: { $gte: today, $lt: tomorrow } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            Revenue.aggregate([
                { $match: { date: { $gte: currentMonthStart } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            Expense.aggregate([
                { $match: { date: { $gte: currentMonthStart } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ])
        ]);

        const revenueToday = todayRev[0]?.total || 0;
        const revenueMonth = monthRev[0]?.total || 0;
        const expensesMonth = monthExp[0]?.total || 0;

        // Fetch commission rate and calculate commissions for the month
        const { getSettingValue } = require('./settingController');
        const commissionRate = await getSettingValue('commission_rate', 0.30);
        
        const monthBookings = await Booking.find({
            status: 'Completed',
            commissionStatus: 'Unpaid',
            updatedAt: { $gte: currentMonthStart }
        });

        const totalCommissionOwed = monthBookings.reduce((sum, b) => {
            const retailTotal = (b.purchasedProducts || []).reduce((s, p) => s + (Number(p.price || 0) * Number(p.quantity || 0)), 0);
            const commissionablePrice = Math.max(0, (b.totalPrice || 0) - retailTotal);
            return sum + (commissionablePrice * commissionRate);
        }, 0);

        // Net Profit = Revenue - Expenses - Commissions
        const profitMonth = revenueMonth - expensesMonth - totalCommissionOwed;

        // 2. OPERATIONS: Booking Load
        const [todayBookings, tomorrowBookings, activeRentals] = await Promise.all([
            Booking.countDocuments({ bookingDate: { $gte: today, $lt: tomorrow }, status: { $ne: 'Cancelled' } }),
            Booking.countDocuments({ bookingDate: { $gte: tomorrow, $lt: new Date(tomorrow.getTime() + 86400000) }, status: { $ne: 'Cancelled' } }),
            RentalBooking.countDocuments({ status: 'Ongoing' })
        ]);

        // 3. HR: Presence Status
        const [clockedIn, totalStaff] = await Promise.all([
            Attendance.countDocuments({ clockInTime: { $gte: today }, clockOutTime: null }),
            Employee.countDocuments({ status: 'Active', role: { $ne: 'admin' } })
        ]);

        // 4. INVENTORY: Critical Stock
        const lowStockItems = await Product.find({ 
            $expr: { $lte: ["$stock", "$minStock"] } 
        }).limit(3);

        // 5. Build the "Intelligence" Response
        // This gives the frontend raw data OR templated suggestions
        res.json({
            greeting: getTimeBasedGreeting(),
            finance: {
                revenueToday,
                revenueMonth,
                expensesMonth,
                profitMonth,
                pulse: revenueMonth > expensesMonth ? 'positive' : 'tight'
            },
            operations: {
                todayBookings,
                tomorrowBookings,
                activeRentals,
                capacityAlert: todayBookings > 10 && clockedIn < 3
            },
            hr: {
                clockedIn,
                totalStaff,
                presenceRate: totalStaff > 0 ? (clockedIn / totalStaff) * 100 : 0
            },
            inventory: {
                lowStockCount: lowStockItems.length,
                urgentItems: lowStockItems.map(i => i.name)
            }
        });

    } catch (err) {
        console.error('Sandi Insight Error:', err);
        res.status(500).json({ error: 'Sandi is currently resting. Try again later.' });
    }
};

const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning, Boss!";
    if (hour < 17) return "Good afternoon!";
    return "Good evening!";
};

module.exports = { getSandiInsights };
