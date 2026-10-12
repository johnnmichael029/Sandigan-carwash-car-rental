const Booking = require('../models/bookingModel');
const CarRental = require('../models/carRentalModel');
const Revenue = require('../models/revenueModel');
const Expense = require('../models/expenseModel');
const Customer = require('../models/customerModel');
const Membership = require('../models/membershipModel');
const Employee = require('../models/employeeModel');
const RentalFleet = require('../models/rentalFleetModel');
const VehicleType = require('../models/vehicleTypeModel');
const { mapToVehicleCategory } = require('../utils/vehicleCategorizer');

// Builds the full dashboard analytics object (reused by the export engine)
const buildDashboardAnalytics = async (filter = {}) => {
    {
        const { startDate, endDate } = filter || {};
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

        let trendStartDate = twelveMonthsAgo;
        let trendEndDate = now;

        if (startDate) {
            const s = new Date(startDate);
            if (!isNaN(s.getTime())) {
                s.setHours(0, 0, 0, 0);
                trendStartDate = s;
            }
        }
        if (endDate) {
            const e = new Date(endDate);
            if (!isNaN(e.getTime())) {
                e.setHours(23, 59, 59, 999);
                trendEndDate = e;
            }
        }

        // Run queries in parallel for high performance
        const [
            // 1. KPI Queries
            todayRevAgg,
            monthRevAgg,
            allTimeRevAgg,
            todayCarwashBookings,
            activeRentalsCount,
            monthExpensesAgg,
            activeMembershipsCount,
            topDetailerMonthAgg,

            // 2. Revenue Analytics
            monthlyRevenueTrend,
            revenueByCategoryAgg,

            // 3. Carwash Analytics
            servicePopularityThisMonth,
            servicePopularityLastMonth,
            vehicleTypeAgg,
            bookingFunnelAgg,
            locationSplitAgg,

            // 4. Car Rental Analytics
            rentalRevenueTrend,
            topRentedVehiclesAgg,
            rentalDurationAgg,
            rentalStatusAgg,
            totalFleetCount,

            // 5. Customer & Loyalty Analytics
            customerGrowthTrend,
            membershipSummaryAgg,
            customerRepeatAgg,

            // 6. Workforce Analytics
            detailerLeaderboardAgg,
            busyHoursAgg,

            // 7. Finance Analytics
            monthlyFinancialsAgg,
            expenseCategoryAgg,

            // 8. Vehicle Types Library (for dynamic categorization)
            dbVehicleTypes
        ] = await Promise.all([
            // --- 1. KPI Queries ---
            Revenue.aggregate([
                { $match: { date: { $gte: startOfToday } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Revenue.aggregate([
                { $match: { date: { $gte: startOfThisMonth } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Revenue.aggregate([
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Booking.countDocuments({
                createdAt: { $gte: startOfToday },
                status: { $ne: 'Cancelled' },
                $or: [{ isRental: false }, { isRental: { $exists: false } }]
            }),
            CarRental.countDocuments({ status: { $in: ['Active', 'Confirmed', 'Pending'] } }),
            Expense.aggregate([
                { $match: { date: { $gte: startOfThisMonth } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Membership.countDocuments({ status: 'Active' }),
            Booking.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startOfThisMonth },
                        status: { $ne: 'Cancelled' },
                        detailer: { $ne: '', $exists: true, $nin: [null, ''] }
                    }
                },
                { $group: { _id: '$detailer', count: { $sum: 1 }, totalRevenue: { $sum: '$totalPrice' } } },
                { $sort: { count: -1 } },
                { $limit: 1 }
            ]),

            // --- 2. Revenue Analytics ---
            Revenue.aggregate([
                { $match: { date: { $gte: trendStartDate, $lte: trendEndDate } } },
                {
                    $project: {
                        date: 1,
                        amount: 1,
                        category: {
                            $switch: {
                                branches: [
                                    { case: { $in: ['$category', ['Service', 'Car Wash', 'Carwash', 'Wash']] }, then: 'Service' },
                                    { case: { $in: ['$category', ['Rental', 'Rental Fleet', 'Car Rental', 'Rental Fee']] }, then: 'Rental' },
                                    { case: { $in: ['$category', ['Retail', 'Retails', 'Merchandise', 'Product']] }, then: 'Retail' },
                                    { case: { $in: ['$category', ['Membership', 'Memberships', 'SMC']] }, then: 'Membership' },
                                    { case: { $in: ['$category', ['Mixed']] }, then: 'Mixed' }
                                ],
                                default: '$category'
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$date' },
                            month: { $month: '$date' }
                        },
                        total: { $sum: '$amount' },
                        carwash: {
                            $sum: {
                                $cond: [{ $eq: ['$category', 'Service'] }, '$amount', 0]
                            }
                        },
                        rental: {
                            $sum: {
                                $cond: [{ $eq: ['$category', 'Rental'] }, '$amount', 0]
                            }
                        },
                        retail: {
                            $sum: {
                                $cond: [
                                    { $in: ['$category', ['Retail', 'Membership', 'Mixed']] },
                                    '$amount',
                                    0
                                ]
                            }
                        }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),
            Revenue.aggregate([
                { $match: { date: { $gte: trendStartDate, $lte: trendEndDate } } },
                {
                    $project: {
                        amount: 1,
                        category: {
                            $switch: {
                                branches: [
                                    { case: { $in: ['$category', ['Service', 'Car Wash', 'Carwash', 'Wash']] }, then: 'Service' },
                                    { case: { $in: ['$category', ['Rental', 'Rental Fleet', 'Car Rental', 'Rental Fee']] }, then: 'Rental' },
                                    { case: { $in: ['$category', ['Retail', 'Retails', 'Merchandise', 'Product']] }, then: 'Retail' },
                                    { case: { $in: ['$category', ['Membership', 'Memberships', 'SMC']] }, then: 'Membership' },
                                    { case: { $in: ['$category', ['Mixed']] }, then: 'Mixed' }
                                ],
                                default: '$category'
                            }
                        }
                    }
                },
                { $group: { _id: '$category', total: { $sum: '$amount' } } },
                { $sort: { total: -1 } }
            ]),

            // --- 3. Carwash Analytics ---
            Booking.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startOfThisMonth },
                        status: { $ne: 'Cancelled' },
                        $or: [{ isRental: false }, { isRental: { $exists: false } }]
                    }
                },
                { $unwind: '$serviceType' },
                { $group: { _id: '$serviceType', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 8 }
            ]),
            Booking.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
                        status: { $ne: 'Cancelled' },
                        $or: [{ isRental: false }, { isRental: { $exists: false } }]
                    }
                },
                { $unwind: '$serviceType' },
                { $group: { _id: '$serviceType', count: { $sum: 1 } } }
            ]),
            Booking.aggregate([
                {
                    $match: {
                        status: { $ne: 'Cancelled' },
                        $or: [{ isRental: false }, { isRental: { $exists: false } }]
                    }
                },
                { $group: { _id: '$vehicleType', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            Booking.aggregate([
                {
                    $match: {
                        $or: [{ isRental: false }, { isRental: { $exists: false } }]
                    }
                },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Booking.aggregate([
                {
                    $match: {
                        status: { $ne: 'Cancelled' },
                        $or: [{ isRental: false }, { isRental: { $exists: false } }]
                    }
                },
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $eq: ['$serviceLocationType', 'Home Service'] },
                                'Home Service',
                                'In-Store'
                            ]
                        },
                        count: { $sum: 1 }
                    }
                }
            ]),

            // --- 4. Car Rental Analytics ---
            CarRental.aggregate([
                {
                    $match: {
                        status: { $ne: 'Cancelled' },
                        ...(startDate || endDate ? { createdAt: { $gte: trendStartDate, $lte: trendEndDate } } : {})
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        totalRevenue: { $sum: '$estimatedTotal' },
                        totalRentals: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),
            CarRental.aggregate([
                {
                    $match: {
                        status: { $ne: 'Cancelled' },
                        ...(startDate || endDate ? { createdAt: { $gte: trendStartDate, $lte: trendEndDate } } : {})
                    }
                },
                {
                    $group: {
                        _id: '$vehicleName',
                        count: { $sum: 1 },
                        totalDays: { $sum: '$rentalDays' },
                        totalRevenue: { $sum: '$estimatedTotal' }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 6 }
            ]),
            CarRental.aggregate([
                { $match: { status: { $ne: 'Cancelled' } } },
                {
                    $bucket: {
                        groupBy: '$rentalDays',
                        boundaries: [1, 2, 4, 8, 999],
                        default: '8+ Days',
                        output: { count: { $sum: 1 } }
                    }
                }
            ]),
            CarRental.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            RentalFleet.countDocuments(),

            // --- 5. Customer & Loyalty Analytics ---
            Customer.aggregate([
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),
            Membership.aggregate([
                {
                    $group: {
                        _id: null,
                        smcCount: {
                            $sum: { $cond: [{ $eq: ['$cardType', 'SMC'] }, 1, 0] }
                        },
                        loyaltyCount: {
                            $sum: { $cond: [{ $eq: ['$cardType', 'Loyalty'] }, 1, 0] }
                        },
                        totalStamps: { $sum: '$totalStampsEarned' },
                        rewardsRedeemed: { $sum: '$rewardCount' }
                    }
                }
            ]),
            Booking.aggregate([
                { $group: { _id: '$emailAddress', count: { $sum: 1 } } },
                {
                    $group: {
                        _id: {
                            $cond: [{ $gt: ['$count', 1] }, 'Repeat Customer', 'First-time Customer']
                        },
                        total: { $sum: 1 }
                    }
                }
            ]),

            // --- 6. Workforce Analytics ---
            Booking.aggregate([
                {
                    $match: {
                        status: { $ne: 'Cancelled' },
                        detailer: { $ne: '', $exists: true, $nin: [null, ''] }
                    }
                },
                {
                    $group: {
                        _id: '$detailer',
                        completedJobs: { $sum: 1 },
                        totalRevenue: { $sum: '$totalPrice' }
                    }
                },
                { $sort: { completedJobs: -1 } },
                { $limit: 10 }
            ]),
            Booking.aggregate([
                {
                    $match: {
                        status: { $ne: 'Cancelled' },
                        $or: [{ isRental: false }, { isRental: { $exists: false } }]
                    }
                },
                {
                    $group: {
                        _id: '$bookingTime',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]),

            // --- 7. Finance Analytics ---
            Promise.all([
                Revenue.aggregate([
                    { $match: { date: { $gte: twelveMonthsAgo } } },
                    {
                        $group: {
                            _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                            totalRevenue: { $sum: '$amount' }
                        }
                    }
                ]),
                Expense.aggregate([
                    { $match: { date: { $gte: twelveMonthsAgo } } },
                    {
                        $group: {
                            _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                            totalExpense: { $sum: '$amount' }
                        }
                    }
                ])
            ]),
            Expense.aggregate([
                { $group: { _id: '$category', total: { $sum: '$amount' } } },
                { $sort: { total: -1 } }
            ]),
            VehicleType.find({}).lean()
        ]);

        // Helper for Month labels
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Extract KPI values
        const todayRevenue = todayRevAgg[0]?.total || 0;
        const monthRevenue = monthRevAgg[0]?.total || 0;
        const allTimeRevenue = allTimeRevAgg[0]?.total || 0;
        const monthExpense = monthExpensesAgg[0]?.total || 0;
        const netProfitMonth = monthRevenue - monthExpense;

        const topDetailer = topDetailerMonthAgg[0] ? {
            name: topDetailerMonthAgg[0]._id,
            jobs: topDetailerMonthAgg[0].count,
            revenue: topDetailerMonthAgg[0].totalRevenue
        } : null;

        // Format Monthly Revenue Trend
        const revenueTrendFormatted = monthlyRevenueTrend.map(item => ({
            month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
            total: item.total,
            carwash: item.carwash || (item.total - (item.rental + item.retail)),
            rental: item.rental,
            retail: item.retail
        }));

        // Service Popularity Map with Last Month comparison
        const lastMonthMap = {};
        servicePopularityLastMonth.forEach(item => {
            lastMonthMap[item._id] = item.count;
        });

        const servicePopularityFormatted = servicePopularityThisMonth.map(item => ({
            service: item._id,
            thisMonth: item.count,
            lastMonth: lastMonthMap[item._id] || 0
        }));

        // Format Car Rental Monthly Trend
        const rentalTrendFormatted = rentalRevenueTrend.map(item => ({
            month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
            revenue: item.totalRevenue,
            rentals: item.totalRentals
        }));

        // Duration bucket names mapping
        const durationBucketLabels = {
            1: '1 Day',
            2: '2-3 Days',
            4: '4-7 Days',
            8: '8+ Days'
        };
        const rentalDurationFormatted = rentalDurationAgg.map(item => ({
            duration: durationBucketLabels[item._id] || `${item._id} Days`,
            count: item.count
        }));

        // Format Customer Growth
        const customerGrowthFormatted = customerGrowthTrend.map(item => ({
            month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
            newCustomers: item.count
        }));

        // Format Financial Overview (Combine Revenue and Expenses by Month)
        const [revByMonth, expByMonth] = monthlyFinancialsAgg;
        const financialMap = {};

        revByMonth.forEach(r => {
            const key = `${r._id.year}-${r._id.month}`;
            financialMap[key] = {
                month: `${monthNames[r._id.month - 1]} ${r._id.year}`,
                revenue: r.totalRevenue,
                expense: 0,
                netProfit: r.totalRevenue
            };
        });

        expByMonth.forEach(e => {
            const key = `${e._id.year}-${e._id.month}`;
            if (!financialMap[key]) {
                financialMap[key] = {
                    month: `${monthNames[e._id.month - 1]} ${e._id.year}`,
                    revenue: 0,
                    expense: e.totalExpense,
                    netProfit: -e.totalExpense
                };
            } else {
                financialMap[key].expense = e.totalExpense;
                financialMap[key].netProfit = financialMap[key].revenue - e.totalExpense;
            }
        });

        const financialOverviewFormatted = Object.values(financialMap);

        // Dynamic lookup table from DB VehicleType collection
        const dbVehicleCategoryMap = {};
        if (Array.isArray(dbVehicleTypes)) {
            dbVehicleTypes.forEach(vt => {
                if (vt.name && vt.category) {
                    dbVehicleCategoryMap[vt.name.trim().toLowerCase()] = vt.category.trim();
                }
            });
        }

        // Standardize and group Vehicle Types into clean categories + sub-model breakdown
        const vehicleCategoryMap = {};
        const vehicleCategoryDetails = {};

        vehicleTypeAgg.forEach(v => {
            const rawModel = v._id || 'Other';
            const lower = rawModel.trim().toLowerCase();
            const category = dbVehicleCategoryMap[lower] || mapToVehicleCategory(rawModel);
            vehicleCategoryMap[category] = (vehicleCategoryMap[category] || 0) + v.count;

            if (!vehicleCategoryDetails[category]) {
                vehicleCategoryDetails[category] = [];
            }
            vehicleCategoryDetails[category].push({ model: rawModel, count: v.count });
        });

        // Sort sub-models inside each category by count descending
        Object.keys(vehicleCategoryDetails).forEach(cat => {
            vehicleCategoryDetails[cat].sort((a, b) => b.count - a.count);
        });

        const vehicleTypeDistributionFormatted = Object.entries(vehicleCategoryMap)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count);

        return {
            success: true,
            kpis: {
                todayRevenue,
                monthRevenue,
                allTimeRevenue,
                todayCarwashBookings,
                activeCarRentals: activeRentalsCount,
                monthExpense,
                netProfitMonth,
                activeMemberships: activeMembershipsCount,
                topDetailer
            },
            revenue: {
                trend: revenueTrendFormatted,
                byCategory: revenueByCategoryAgg.map(c => ({ category: c._id || 'Other', total: c.total }))
            },
            carwash: {
                servicePopularity: servicePopularityFormatted,
                vehicleTypeDistribution: vehicleTypeDistributionFormatted,
                vehicleCategoryDetails,
                bookingFunnel: bookingFunnelAgg.map(f => ({ status: f._id || 'Unknown', count: f.count })),
                locationSplit: locationSplitAgg.map(l => ({ location: l._id || 'In-Store', count: l.count }))
            },
            carRental: {
                trend: rentalTrendFormatted,
                topVehicles: topRentedVehiclesAgg.map(v => ({
                    name: v._id,
                    rentals: v.count,
                    days: v.totalDays,
                    revenue: v.totalRevenue
                })),
                durationDistribution: rentalDurationFormatted,
                statusBreakdown: rentalStatusAgg.map(s => ({ status: s._id || 'Unknown', count: s.count })),
                fleetUtilization: {
                    activeRentals: activeRentalsCount,
                    totalFleet: totalFleetCount,
                    utilizationRate: totalFleetCount > 0 ? Math.round((activeRentalsCount / totalFleetCount) * 100) : 0
                }
            },
            customer: {
                growthTrend: customerGrowthFormatted,
                memberships: membershipSummaryAgg[0] || { smcCount: 0, loyaltyCount: 0, totalStamps: 0, rewardsRedeemed: 0 },
                repeatVsFirstTime: customerRepeatAgg.map(c => ({ type: c._id, count: c.total }))
            },
            workforce: {
                leaderboard: detailerLeaderboardAgg.map((d, index) => ({
                    rank: index + 1,
                    name: d._id,
                    jobs: d.completedJobs,
                    revenue: d.totalRevenue
                })),
                busyHours: busyHoursAgg.map(b => ({ time: b._id || 'Unspecified', count: b.count }))
            },
            finance: {
                monthlyOverview: financialOverviewFormatted,
                expenseCategories: expenseCategoryAgg.map(e => ({ category: e._id || 'Other', total: e.total }))
            }
        };
    }
};

// GET /api/analytics/dashboard
const getDashboardAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        res.json(await buildDashboardAnalytics({ startDate, endDate }));
    } catch (error) {
        console.error('[ANALYTICS_ERROR]', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to fetch analytics data' });
    }
};

module.exports = { getDashboardAnalytics, buildDashboardAnalytics };
