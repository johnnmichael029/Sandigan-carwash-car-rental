/**
 * Export Registry
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for every exportable dataset in the system.
 *
 * Each dataset defines:
 *   key        - unique id used in the URL  (GET /api/exports/:key)
 *   label      - human readable name (sheet / section title)
 *   department - permission group: 'Finance' | 'Operations' | 'Workforce' |
 *                'Inventory' | 'Clientele' | 'Dashboard' | 'System'
 *                ('Dashboard' and 'System' are restricted to Admin / Super Admin)
 *   dateField  - field used for the from/to date range (null = not date-filtered)
 *   fetch      - async ({ from, to, limit }) => plain row objects
 *   columns    - [{ header, key, type, width }]
 *                type: 'text' | 'number' | 'money' | 'date' | 'datetime' | 'bool'
 *
 * SECURITY: only fields listed in `columns` are ever written to a file, so
 * passwords, payment proof images, push tokens, etc. can never leak.
 */

const Booking = require('../models/bookingModel');
const CarRental = require('../models/carRentalModel');
const Revenue = require('../models/revenueModel');
const Expense = require('../models/expenseModel');
const Payable = require('../models/payableModel');
const RetailSale = require('../models/retailSaleModel');
const Budget = require('../models/budgetModel');
const Employee = require('../models/employeeModel');
const Attendance = require('../models/attendanceModel');
const Payout = require('../models/payoutModel');
const Leave = require('../models/leaveModel');
const Inventory = require('../models/inventoryModel');
const StockMovement = require('../models/stockMovementModel');
const PurchaseOrder = require('../models/purchaseOrderModel');
const Product = require('../models/productModel');
const Vendor = require('../models/vendorModel');
const Customer = require('../models/customerModel');
const Membership = require('../models/membershipModel');
const Promotion = require('../models/promotionModel');
const RentalFleet = require('../models/rentalFleetModel');
const Bay = require('../models/bayModel');
const Asset = require('../models/assetModel');
const MaintenanceProject = require('../models/maintenanceProjectModel');
const ActivityLog = require('../models/activityLogModel');
const { buildDashboardAnalytics } = require('../controllers/analyticsController');

const MAX_ROWS = 50000;

// Departments shown in the UI (order matters)
const DEPARTMENTS = [
    { key: 'Dashboard', label: 'Dashboard Analytics', adminOnly: true },
    { key: 'Finance', label: 'Sales & Finance' },
    { key: 'Operations', label: 'Operations (Carwash & Rental)' },
    { key: 'Workforce', label: 'Workforce (HRIS)' },
    { key: 'Inventory', label: 'Inventory' },
    { key: 'Clientele', label: 'Clientele (CRM & Loyalty)' },
    { key: 'System', label: 'System Audit Log', adminOnly: true },
];

/** Builds a Mongo date filter for the dataset's date field. */
const dateFilter = (field, from, to) => {
    if (!field || (!from && !to)) return {};
    const range = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    return { [field]: range };
};

/** Same as dateFilter but for fields stored as 'YYYY-MM-DD' strings. */
const dateStrFilter = (field, from, to) => {
    if (!from && !to) return {};
    const toStr = (d) => new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10); // Manila date
    const range = {};
    if (from) range.$gte = toStr(from);
    if (to) range.$lte = toStr(to);
    return { [field]: range };
};

const nonRental = { $or: [{ isRental: false }, { isRental: { $exists: false } }] };

const DATASETS = [
    // ════════════════════════════ DASHBOARD ════════════════════════════
    {
        key: 'dashboard-kpis',
        label: 'Dashboard KPI Summary',
        department: 'Dashboard',
        dateField: null,
        columns: [
            { header: 'Metric', key: 'metric', type: 'text', width: 34 },
            { header: 'Value', key: 'value', type: 'text', width: 26 },
        ],
        fetch: async () => {
            const a = await buildDashboardAnalytics();
            const k = a.kpis;
            const peso = (n) => `PHP ${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const rev = k.monthRevenue || 0;
            return [
                { metric: "Today's Revenue", value: peso(k.todayRevenue) },
                { metric: 'This Month Revenue', value: peso(k.monthRevenue) },
                { metric: 'This Month Expenses', value: peso(k.monthExpense) },
                { metric: 'This Month Net Profit', value: peso(k.netProfitMonth) },
                { metric: 'Net Profit Margin (Month)', value: rev > 0 ? `${Math.round((k.netProfitMonth / rev) * 100)}%` : 'No revenue yet' },
                { metric: 'All-Time Revenue', value: peso(k.allTimeRevenue) },
                { metric: "Today's Carwash Bookings", value: String(k.todayCarwashBookings || 0) },
                { metric: 'Active Car Rentals', value: String(k.activeCarRentals || 0) },
                { metric: 'Active Memberships', value: String(k.activeMemberships || 0) },
                { metric: 'Top Detailer (Month)', value: k.topDetailer ? `${k.topDetailer.name} (${k.topDetailer.jobs} jobs)` : 'No data' },
                { metric: 'Fleet Utilization', value: `${a.carRental.fleetUtilization.utilizationRate}% (${a.carRental.fleetUtilization.activeRentals}/${a.carRental.fleetUtilization.totalFleet})` },
            ];
        },
    },
    {
        key: 'dashboard-revenue-trend',
        label: 'Monthly Revenue vs Expenses',
        department: 'Dashboard',
        dateField: null,
        columns: [
            { header: 'Month', key: 'month', type: 'text', width: 14 },
            { header: 'Revenue', key: 'revenue', type: 'money', width: 16 },
            { header: 'Expenses', key: 'expense', type: 'money', width: 16 },
            { header: 'Net Profit', key: 'netProfit', type: 'money', width: 16 },
        ],
        fetch: async () => (await buildDashboardAnalytics()).finance.monthlyOverview,
    },
    {
        key: 'dashboard-services',
        label: 'Service Popularity',
        department: 'Dashboard',
        dateField: null,
        columns: [
            { header: 'Service', key: 'service', type: 'text', width: 30 },
            { header: 'Total Bookings', key: 'thisMonth', type: 'number', width: 16 },
            { header: 'Last Month', key: 'lastMonth', type: 'number', width: 14 },
        ],
        fetch: async () => (await buildDashboardAnalytics()).carwash.servicePopularity,
    },
    {
        key: 'dashboard-fleet',
        label: 'Top Rented Vehicles',
        department: 'Dashboard',
        dateField: null,
        columns: [
            { header: 'Vehicle', key: 'name', type: 'text', width: 28 },
            { header: 'Rentals', key: 'rentals', type: 'number', width: 12 },
            { header: 'Total Days', key: 'days', type: 'number', width: 12 },
            { header: 'Revenue', key: 'revenue', type: 'money', width: 16 },
        ],
        fetch: async () => (await buildDashboardAnalytics()).carRental.topVehicles,
    },
    {
        key: 'dashboard-leaderboard',
        label: 'Detailer Leaderboard',
        department: 'Dashboard',
        dateField: null,
        columns: [
            { header: 'Rank', key: 'rank', type: 'number', width: 8 },
            { header: 'Detailer', key: 'name', type: 'text', width: 26 },
            { header: 'Jobs', key: 'jobs', type: 'number', width: 10 },
            { header: 'Revenue', key: 'revenue', type: 'money', width: 16 },
        ],
        fetch: async () => (await buildDashboardAnalytics()).workforce.leaderboard,
    },

    // ════════════════════════════ FINANCE ════════════════════════════
    {
        key: 'revenue',
        label: 'Sales / Revenue Ledger',
        department: 'Finance',
        dateField: 'date',
        columns: [
            { header: 'Date', key: 'date', type: 'datetime', width: 20 },
            { header: 'Title', key: 'title', type: 'text', width: 36 },
            { header: 'Category', key: 'category', type: 'text', width: 16 },
            { header: 'Source', key: 'source', type: 'text', width: 14 },
            { header: 'Reference', key: 'referenceId', type: 'text', width: 20 },
            { header: 'Amount', key: 'amount', type: 'money', width: 14 },
            { header: 'Recorded By', key: 'recordedBy', type: 'text', width: 20 },
        ],
        fetch: async ({ from, to, limit }) => {
            const docs = await Revenue.find(dateFilter('date', from, to)).populate('recordedBy', 'fullName').sort({ date: -1 }).limit(limit).lean();
            return docs.map(d => ({ ...d, recordedBy: d.recordedBy?.fullName || 'System' }));
        },
    },
    {
        key: 'expenses',
        label: 'Expenses',
        department: 'Finance',
        dateField: 'date',
        columns: [
            { header: 'Date', key: 'date', type: 'datetime', width: 20 },
            { header: 'Title', key: 'title', type: 'text', width: 32 },
            { header: 'Category', key: 'category', type: 'text', width: 18 },
            { header: 'Amount', key: 'amount', type: 'money', width: 14 },
            { header: 'Description', key: 'description', type: 'text', width: 36 },
            { header: 'Recorded By', key: 'recordedBy', type: 'text', width: 20 },
        ],
        fetch: async ({ from, to, limit }) => {
            const docs = await Expense.find(dateFilter('date', from, to)).populate('recordedBy', 'fullName').sort({ date: -1 }).limit(limit).lean();
            return docs.map(d => ({ ...d, recordedBy: d.recordedBy?.fullName || 'System' }));
        },
    },
    {
        key: 'retail-sales',
        label: 'Retail Sales',
        department: 'Finance',
        dateField: 'createdAt',
        columns: [
            { header: 'Date', key: 'createdAt', type: 'datetime', width: 20 },
            { header: 'Transaction ID', key: 'transactionId', type: 'text', width: 22 },
            { header: 'Product', key: 'productName', type: 'text', width: 26 },
            { header: 'Qty', key: 'quantity', type: 'number', width: 8 },
            { header: 'Total', key: 'totalPrice', type: 'money', width: 14 },
            { header: 'Payment', key: 'paymentMethod', type: 'text', width: 12 },
            { header: 'Customer Type', key: 'customerType', type: 'text', width: 14 },
            { header: 'SMC ID', key: 'smcId', type: 'text', width: 16 },
        ],
        fetch: async ({ from, to, limit }) =>
            RetailSale.find(dateFilter('createdAt', from, to)).sort({ createdAt: -1 }).limit(limit).lean(),
    },
    {
        key: 'payables',
        label: 'Vendor Payables',
        department: 'Finance',
        dateField: 'issueDate',
        columns: [
            { header: 'Bill #', key: 'billNumber', type: 'text', width: 18 },
            { header: 'Vendor', key: 'vendor', type: 'text', width: 24 },
            { header: 'Description', key: 'description', type: 'text', width: 30 },
            { header: 'Issue Date', key: 'issueDate', type: 'date', width: 13 },
            { header: 'Due Date', key: 'dueDate', type: 'date', width: 13 },
            { header: 'Amount', key: 'amount', type: 'money', width: 14 },
            { header: 'Paid', key: 'amountPaid', type: 'money', width: 14 },
            { header: 'Balance', key: 'balanceOwed', type: 'money', width: 14 },
            { header: 'Status', key: 'status', type: 'text', width: 14 },
        ],
        fetch: async ({ from, to, limit }) => {
            const docs = await Payable.find(dateFilter('issueDate', from, to)).populate('vendorId', 'name').sort({ issueDate: -1 }).limit(limit).lean();
            return docs.map(d => ({ ...d, vendor: d.vendorId?.name || '—' }));
        },
    },
    {
        key: 'budgets',
        label: 'Budgets',
        department: 'Finance',
        dateField: null,
        columns: [
            { header: 'Month', key: 'month', type: 'text', width: 12 },
            { header: 'Category', key: 'category', type: 'text', width: 24 },
            { header: 'Allocated', key: 'allocatedAmount', type: 'money', width: 16 },
        ],
        fetch: async ({ limit }) => Budget.find({}).sort({ month: -1, category: 1 }).limit(limit).lean(),
    },

    // ════════════════════════════ OPERATIONS ════════════════════════════
    {
        key: 'bookings',
        label: 'Carwash Bookings',
        department: 'Operations',
        dateField: 'createdAt',
        columns: [
            { header: 'Date', key: 'createdAt', type: 'datetime', width: 20 },
            { header: 'Batch ID', key: 'batchId', type: 'text', width: 18 },
            { header: 'Customer', key: 'customer', type: 'text', width: 24 },
            { header: 'Phone', key: 'phoneNumber', type: 'text', width: 15 },
            { header: 'Vehicle', key: 'vehicleType', type: 'text', width: 16 },
            { header: 'Services', key: 'services', type: 'text', width: 32 },
            { header: 'Time Slot', key: 'bookingTime', type: 'text', width: 12 },
            { header: 'Location', key: 'location', type: 'text', width: 14 },
            { header: 'Status', key: 'status', type: 'text', width: 13 },
            { header: 'Detailer', key: 'detailer', type: 'text', width: 18 },
            { header: 'Discount', key: 'discount', type: 'money', width: 12 },
            { header: 'Total', key: 'totalPrice', type: 'money', width: 13 },
            { header: 'Payment Method', key: 'paymentMethod', type: 'text', width: 15 },
            { header: 'Payment Status', key: 'paymentStatus', type: 'text', width: 18 },
        ],
        fetch: async ({ from, to, limit }) => {
            const docs = await Booking.find({ ...nonRental, ...dateFilter('createdAt', from, to) })
                .select('-payment.proofImageBase64').sort({ createdAt: -1 }).limit(limit).lean();
            return docs.map(d => ({
                ...d,
                customer: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
                services: Array.isArray(d.serviceType) ? d.serviceType.join(', ') : d.serviceType,
                location: d.serviceLocationType || 'In-Store',
                discount: (d.discountAmount || 0) + (d.promoDiscount || 0),
                paymentMethod: d.payment?.method || '—',
                paymentStatus: d.payment?.status || '—',
            }));
        },
    },
    {
        key: 'car-rentals',
        label: 'Car Rentals',
        department: 'Operations',
        dateField: 'createdAt',
        columns: [
            { header: 'Booked On', key: 'createdAt', type: 'datetime', width: 20 },
            { header: 'Rental ID', key: 'rentalId', type: 'text', width: 18 },
            { header: 'Customer', key: 'fullName', type: 'text', width: 24 },
            { header: 'Contact', key: 'contactNumber', type: 'text', width: 15 },
            { header: 'Vehicle', key: 'vehicleName', type: 'text', width: 22 },
            { header: 'Start', key: 'rentalStartDate', type: 'date', width: 13 },
            { header: 'Return', key: 'returnDate', type: 'date', width: 13 },
            { header: 'Days', key: 'rentalDays', type: 'number', width: 7 },
            { header: 'Rate/Day', key: 'pricePerDay', type: 'money', width: 12 },
            { header: 'Total', key: 'estimatedTotal', type: 'money', width: 13 },
            { header: 'Down Payment', key: 'downPaymentAmount', type: 'money', width: 14 },
            { header: 'Destination', key: 'destination', type: 'text', width: 20 },
            { header: 'Status', key: 'status', type: 'text', width: 12 },
            { header: 'Payment Status', key: 'paymentStatus', type: 'text', width: 18 },
        ],
        fetch: async ({ from, to, limit }) => {
            const docs = await CarRental.find(dateFilter('createdAt', from, to))
                .select('-payment.proofImageBase64').sort({ createdAt: -1 }).limit(limit).lean();
            return docs.map(d => ({ ...d, paymentStatus: d.payment?.status || '—' }));
        },
    },
    {
        key: 'rental-fleet',
        label: 'Rental Fleet',
        department: 'Operations',
        dateField: null,
        columns: [
            { header: 'Vehicle', key: 'vehicleName', type: 'text', width: 26 },
            { header: 'Type', key: 'vehicleType', type: 'text', width: 16 },
            { header: 'Seats', key: 'seats', type: 'number', width: 8 },
            { header: 'Rate/Day', key: 'pricePerDay', type: 'money', width: 13 },
            { header: 'Available', key: 'isAvailable', type: 'bool', width: 11 },
            { header: 'Unavailable Reason', key: 'unavailableReason', type: 'text', width: 26 },
        ],
        fetch: async ({ limit }) => RentalFleet.find({}).select('-imageBase64').sort({ vehicleName: 1 }).limit(limit).lean(),
    },
    {
        key: 'bays',
        label: 'Service Bays',
        department: 'Operations',
        dateField: null,
        columns: [
            { header: 'Bay', key: 'name', type: 'text', width: 20 },
            { header: 'Type', key: 'type', type: 'text', width: 16 },
            { header: 'Status', key: 'status', type: 'text', width: 14 },
            { header: 'Current Booking', key: 'currentBookingId', type: 'text', width: 20 },
            { header: 'Description', key: 'description', type: 'text', width: 30 },
        ],
        fetch: async ({ limit }) => Bay.find({}).sort({ name: 1 }).limit(limit).lean(),
    },
    {
        key: 'assets',
        label: 'Asset Register',
        department: 'Operations',
        dateField: null,
        columns: [
            { header: 'Asset', key: 'name', type: 'text', width: 24 },
            { header: 'Category', key: 'category', type: 'text', width: 14 },
            { header: 'Serial #', key: 'serialNumber', type: 'text', width: 16 },
            { header: 'Purchased', key: 'purchaseDate', type: 'date', width: 13 },
            { header: 'Usage', key: 'usageCounter', type: 'number', width: 9 },
            { header: 'Service Cycle', key: 'serviceCycleBookings', type: 'number', width: 13 },
            { header: 'Status', key: 'status', type: 'text', width: 16 },
            { header: 'Bay', key: 'bay', type: 'text', width: 14 },
            { header: 'Last Service', key: 'lastServiceDate', type: 'date', width: 13 },
        ],
        fetch: async ({ limit }) => {
            const docs = await Asset.find({}).populate('bayId', 'name').sort({ name: 1 }).limit(limit).lean();
            return docs.map(d => ({ ...d, bay: d.bayId?.name || '—' }));
        },
    },
    {
        key: 'maintenance',
        label: 'Maintenance Projects',
        department: 'Operations',
        dateField: 'createdAt',
        columns: [
            { header: 'Created', key: 'createdAt', type: 'date', width: 13 },
            { header: 'Title', key: 'title', type: 'text', width: 28 },
            { header: 'Asset', key: 'asset', type: 'text', width: 20 },
            { header: 'Priority', key: 'priority', type: 'text', width: 10 },
            { header: 'Status', key: 'status', type: 'text', width: 13 },
            { header: 'Assigned To', key: 'assignee', type: 'text', width: 20 },
            { header: 'Parts Cost', key: 'partsCost', type: 'money', width: 13 },
            { header: 'Labor Cost', key: 'laborCost', type: 'money', width: 13 },
            { header: 'Completed', key: 'completionDate', type: 'date', width: 13 },
        ],
        fetch: async ({ from, to, limit }) => {
            const docs = await MaintenanceProject.find(dateFilter('createdAt', from, to))
                .populate('assetId', 'name').populate('assignedPersonnel', 'fullName')
                .sort({ createdAt: -1 }).limit(limit).lean();
            return docs.map(d => ({
                ...d,
                asset: d.assetId?.name || '—',
                assignee: d.assignedPersonnel?.fullName || '—',
                partsCost: (d.partsUsed || []).reduce((s, p) => s + (p.quantity || 0) * (p.costPerUnit || 0), 0),
            }));
        },
    },

    // ════════════════════════════ WORKFORCE ════════════════════════════
    {
        key: 'employees',
        label: 'Employee Directory',
        department: 'Workforce',
        dateField: null,
        columns: [
            { header: 'Employee ID', key: 'employeeId', type: 'text', width: 14 },
            { header: 'Full Name', key: 'fullName', type: 'text', width: 24 },
            { header: 'Role', key: 'role', type: 'text', width: 16 },
            { header: 'Email', key: 'email', type: 'text', width: 26 },
            { header: 'Contact', key: 'contactNumber', type: 'text', width: 15 },
            { header: 'Status', key: 'status', type: 'text', width: 10 },
            { header: 'Shift', key: 'shiftType', type: 'text', width: 10 },
            { header: 'Rest Day', key: 'restDay', type: 'text', width: 11 },
            { header: 'Base Salary', key: 'baseSalary', type: 'money', width: 13 },
            { header: 'Pay Frequency', key: 'salaryFrequency', type: 'text', width: 13 },
            { header: 'Hired', key: 'hiredDate', type: 'date', width: 13 },
        ],
        // Government IDs, passwords and push tokens are intentionally excluded
        fetch: async ({ limit }) => Employee.find({}).select('-password -pushToken -sssNo -tinNo -philhealthNo -pagibigNo').sort({ fullName: 1 }).limit(limit).lean(),
    },
    {
        key: 'attendance',
        label: 'Attendance Logs',
        department: 'Workforce',
        dateField: 'dateStr',
        columns: [
            { header: 'Date', key: 'dateStr', type: 'text', width: 12 },
            { header: 'Employee', key: 'employeeName', type: 'text', width: 24 },
            { header: 'Clock In', key: 'clockInTime', type: 'datetime', width: 20 },
            { header: 'Clock Out', key: 'clockOutTime', type: 'datetime', width: 20 },
            { header: 'Hours', key: 'hours', type: 'number', width: 9 },
            { header: 'OT (min)', key: 'overtimeMinutes', type: 'number', width: 10 },
            { header: 'OT Approved', key: 'isOTApproved', type: 'bool', width: 12 },
            { header: 'Holiday', key: 'holidayType', type: 'text', width: 10 },
            { header: 'Leave', key: 'leaveType', type: 'text', width: 14 },
        ],
        fetch: async ({ from, to, limit }) => {
            const docs = await Attendance.find(dateStrFilter('dateStr', from, to)).populate('employee', 'fullName').sort({ dateStr: -1 }).limit(limit).lean();
            return docs.map(d => ({ ...d, employeeName: d.employee?.fullName || '—', hours: Math.round(((d.durationMinutes || 0) / 60) * 100) / 100 }));
        },
    },
    {
        key: 'payouts',
        label: 'Payroll & Payouts',
        department: 'Workforce',
        dateField: 'createdAt',
        columns: [
            { header: 'Paid On', key: 'createdAt', type: 'datetime', width: 20 },
            { header: 'Employee', key: 'employeeName', type: 'text', width: 24 },
            { header: 'Period', key: 'period', type: 'text', width: 14 },
            { header: 'Basic Pay', key: 'basicPay', type: 'money', width: 13 },
            { header: 'Overtime', key: 'overtimePay', type: 'money', width: 12 },
            { header: 'Holiday', key: 'holidayPay', type: 'money', width: 12 },
            { header: 'Allowances', key: 'allowances', type: 'money', width: 12 },
            { header: 'Gross', key: 'grossPay', type: 'money', width: 13 },
            { header: 'Deductions', key: 'totalDeductions', type: 'money', width: 13 },
            { header: 'Net Pay', key: 'netAmount', type: 'money', width: 13 },
            { header: 'Paid By', key: 'paidByName', type: 'text', width: 20 },
        ],
        fetch: async ({ from, to, limit }) => {
            const docs = await Payout.find(dateFilter('createdAt', from, to))
                .populate('recipient', 'fullName').populate('paidBy', 'fullName')
                .sort({ createdAt: -1 }).limit(limit).lean();
            return docs.map(d => ({ ...d, employeeName: d.recipient?.fullName || '—', paidByName: d.paidBy?.fullName || '—' }));
        },
    },
    {
        key: 'leaves',
        label: 'Leave Requests',
        department: 'Workforce',
        dateField: 'createdAt',
        columns: [
            { header: 'Filed', key: 'createdAt', type: 'date', width: 13 },
            { header: 'Employee', key: 'employeeName', type: 'text', width: 24 },
            { header: 'Type', key: 'leaveType', type: 'text', width: 15 },
            { header: 'Start', key: 'startDate', type: 'text', width: 12 },
            { header: 'End', key: 'endDate', type: 'text', width: 12 },
            { header: 'Days', key: 'totalDays', type: 'number', width: 7 },
            { header: 'Reason', key: 'reason', type: 'text', width: 28 },
            { header: 'Status', key: 'status', type: 'text', width: 11 },
            { header: 'Approved By', key: 'approverName', type: 'text', width: 20 },
        ],
        fetch: async ({ from, to, limit }) => {
            const docs = await Leave.find(dateFilter('createdAt', from, to))
                .populate('employee', 'fullName').populate('approvedBy', 'fullName')
                .sort({ createdAt: -1 }).limit(limit).lean();
            return docs.map(d => ({ ...d, employeeName: d.employee?.fullName || '—', approverName: d.approvedBy?.fullName || '—' }));
        },
    },

    // ════════════════════════════ INVENTORY ════════════════════════════
    {
        key: 'inventory',
        label: 'Stock List',
        department: 'Inventory',
        dateField: null,
        columns: [
            { header: 'Item', key: 'name', type: 'text', width: 26 },
            { header: 'Category', key: 'category', type: 'text', width: 16 },
            { header: 'Current Stock', key: 'currentStock', type: 'number', width: 14 },
            { header: 'Unit', key: 'unit', type: 'text', width: 8 },
            { header: 'Reorder Point', key: 'reorderPoint', type: 'number', width: 14 },
            { header: 'Low Stock', key: 'lowStock', type: 'bool', width: 11 },
            { header: 'Cost/Unit', key: 'costPerUnit', type: 'money', width: 12 },
            { header: 'Stock Value', key: 'stockValue', type: 'money', width: 14 },
            { header: 'Supplier', key: 'supplierName', type: 'text', width: 20 },
            { header: 'Last Restocked', key: 'lastRestocked', type: 'date', width: 14 },
        ],
        fetch: async ({ limit }) => {
            const docs = await Inventory.find({}).populate('supplier', 'name').sort({ name: 1 }).limit(limit).lean();
            return docs.map(d => ({
                ...d,
                lowStock: (d.currentStock || 0) <= (d.reorderPoint || 0),
                stockValue: (d.currentStock || 0) * (d.costPerUnit || 0),
                supplierName: d.supplier?.name || '—',
            }));
        },
    },
    {
        key: 'stock-movements',
        label: 'Stock Movements',
        department: 'Inventory',
        dateField: 'createdAt',
        columns: [
            { header: 'Date', key: 'createdAt', type: 'datetime', width: 20 },
            { header: 'Item', key: 'itemName', type: 'text', width: 24 },
            { header: 'Type', key: 'type', type: 'text', width: 12 },
            { header: 'Qty', key: 'quantity', type: 'number', width: 9 },
            { header: 'Before', key: 'previousStock', type: 'number', width: 10 },
            { header: 'After', key: 'newStock', type: 'number', width: 10 },
            { header: 'Reason', key: 'reason', type: 'text', width: 32 },
            { header: 'By', key: 'performedByName', type: 'text', width: 18 },
        ],
        fetch: async ({ from, to, limit }) => {
            const docs = await StockMovement.find(dateFilter('createdAt', from, to)).populate('inventoryItem', 'name').sort({ createdAt: -1 }).limit(limit).lean();
            return docs.map(d => ({ ...d, itemName: d.inventoryItem?.name || '—' }));
        },
    },
    {
        key: 'purchase-orders',
        label: 'Purchase Orders',
        department: 'Inventory',
        dateField: 'createdAt',
        columns: [
            { header: 'Created', key: 'createdAt', type: 'date', width: 13 },
            { header: 'PO #', key: 'poNumber', type: 'text', width: 18 },
            { header: 'Vendor', key: 'vendorName', type: 'text', width: 22 },
            { header: 'Items', key: 'itemsSummary', type: 'text', width: 40 },
            { header: 'Total', key: 'totalAmount', type: 'money', width: 14 },
            { header: 'Status', key: 'status', type: 'text', width: 12 },
            { header: 'Expected', key: 'expectedDeliveryDate', type: 'date', width: 13 },
            { header: 'Received', key: 'receivedDate', type: 'date', width: 13 },
        ],
        fetch: async ({ from, to, limit }) => {
            const docs = await PurchaseOrder.find(dateFilter('createdAt', from, to))
                .populate('vendor', 'name').populate('items.inventoryItem', 'name')
                .sort({ createdAt: -1 }).limit(limit).lean();
            return docs.map(d => ({
                ...d,
                vendorName: d.vendor?.name || '—',
                itemsSummary: (d.items || []).map(i => `${i.inventoryItem?.name || 'Item'} x${i.quantity}`).join(', '),
            }));
        },
    },
    {
        key: 'products',
        label: 'Product Catalog',
        department: 'Inventory',
        dateField: null,
        columns: [
            { header: 'Product', key: 'name', type: 'text', width: 28 },
            { header: 'Category', key: 'category', type: 'text', width: 16 },
            { header: 'Price', key: 'basePrice', type: 'money', width: 13 },
            { header: 'Description', key: 'description', type: 'text', width: 36 },
        ],
        fetch: async ({ limit }) => Product.find({}).sort({ name: 1 }).limit(limit).lean(),
    },
    {
        key: 'vendors',
        label: 'Vendors',
        department: 'Inventory',
        dateField: null,
        columns: [
            { header: 'Vendor', key: 'name', type: 'text', width: 24 },
            { header: 'Category', key: 'category', type: 'text', width: 13 },
            { header: 'Contact Person', key: 'contactPerson', type: 'text', width: 20 },
            { header: 'Phone', key: 'phone', type: 'text', width: 15 },
            { header: 'Email', key: 'email', type: 'text', width: 24 },
            { header: 'Terms', key: 'paymentTerms', type: 'text', width: 16 },
            { header: 'Total Owed', key: 'totalOwed', type: 'money', width: 13 },
            { header: 'Total Paid', key: 'totalPaid', type: 'money', width: 13 },
            { header: 'Active', key: 'isActive', type: 'bool', width: 8 },
        ],
        fetch: async ({ limit }) => Vendor.find({}).sort({ name: 1 }).limit(limit).lean(),
    },

    // ════════════════════════════ CLIENTELE ════════════════════════════
    {
        key: 'customers',
        label: 'Customers',
        department: 'Clientele',
        dateField: 'createdAt',
        columns: [
            { header: 'Registered', key: 'createdAt', type: 'date', width: 13 },
            { header: 'Name', key: 'name', type: 'text', width: 24 },
            { header: 'Email', key: 'email', type: 'text', width: 26 },
            { header: 'Phone', key: 'phone', type: 'text', width: 15 },
            { header: 'Visits', key: 'totalVisits', type: 'number', width: 8 },
            { header: 'Lifetime Spend', key: 'lifetimeSpend', type: 'money', width: 15 },
            { header: 'Last Visit', key: 'lastVisitDate', type: 'date', width: 13 },
            { header: 'Tags', key: 'tagList', type: 'text', width: 20 },
            { header: 'Vehicles', key: 'vehicleList', type: 'text', width: 24 },
            { header: 'SMC ID', key: 'smcId', type: 'text', width: 14 },
            { header: 'Loyalty Card', key: 'loyaltyCardId', type: 'text', width: 14 },
        ],
        fetch: async ({ from, to, limit }) => {
            const docs = await Customer.find(dateFilter('createdAt', from, to)).select('-password -pushToken').sort({ createdAt: -1 }).limit(limit).lean();
            return docs.map(d => ({
                ...d,
                name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
                tagList: (d.tags || []).join(', '),
                vehicleList: (d.vehicles || []).join(', '),
            }));
        },
    },
    {
        key: 'memberships',
        label: 'Memberships (SMC & Loyalty)',
        department: 'Clientele',
        dateField: 'issuedDate',
        columns: [
            { header: 'Card ID', key: 'cardId', type: 'text', width: 16 },
            { header: 'Type', key: 'cardType', type: 'text', width: 10 },
            { header: 'Customer', key: 'customerName', type: 'text', width: 24 },
            { header: 'Issued', key: 'issuedDate', type: 'date', width: 13 },
            { header: 'Expires', key: 'expiryDate', type: 'date', width: 13 },
            { header: 'Status', key: 'status', type: 'text', width: 11 },
            { header: 'Stamps', key: 'stampCount', type: 'number', width: 9 },
            { header: 'Lifetime Stamps', key: 'totalStampsEarned', type: 'number', width: 15 },
            { header: 'Rewards Redeemed', key: 'rewardCount', type: 'number', width: 16 },
            { header: 'Reward Pending', key: 'pendingReward', type: 'bool', width: 14 },
        ],
        fetch: async ({ from, to, limit }) =>
            Membership.find(dateFilter('issuedDate', from, to)).select('-stampHistory -rewardHistory').sort({ issuedDate: -1 }).limit(limit).lean(),
    },
    {
        key: 'promotions',
        label: 'Promotions',
        department: 'Clientele',
        dateField: null,
        columns: [
            { header: 'Code', key: 'code', type: 'text', width: 16 },
            { header: 'Description', key: 'description', type: 'text', width: 30 },
            { header: 'Type', key: 'discountType', type: 'text', width: 12 },
            { header: 'Value', key: 'discountValue', type: 'number', width: 9 },
            { header: 'Min Spend', key: 'minSpend', type: 'money', width: 12 },
            { header: 'Valid From', key: 'validFrom', type: 'date', width: 13 },
            { header: 'Valid Until', key: 'validUntil', type: 'date', width: 13 },
            { header: 'Usage', key: 'usageCount', type: 'number', width: 9 },
            { header: 'Max Usage', key: 'maxUsage', type: 'number', width: 10 },
            { header: 'Active', key: 'isActive', type: 'bool', width: 8 },
        ],
        fetch: async ({ limit }) => Promotion.find({}).select('-usedBy').sort({ createdAt: -1 }).limit(limit).lean(),
    },

    // ════════════════════════════ SYSTEM ════════════════════════════
    {
        key: 'audit-logs',
        label: 'System Audit Log',
        department: 'System',
        dateField: 'createdAt',
        columns: [
            { header: 'Date & Time', key: 'createdAt', type: 'datetime', width: 20 },
            { header: 'Actor', key: 'actorName', type: 'text', width: 22 },
            { header: 'Role', key: 'actorRole', type: 'text', width: 16 },
            { header: 'Module', key: 'module', type: 'text', width: 13 },
            { header: 'Action', key: 'action', type: 'text', width: 24 },
            { header: 'Message', key: 'message', type: 'text', width: 60 },
        ],
        fetch: async ({ from, to, limit, filters = {} }) => {
            const q = dateFilter('createdAt', from, to);
            if (filters.module) q.module = String(filters.module).toUpperCase();
            return ActivityLog.find(q).select('-meta').sort({ createdAt: -1 }).limit(limit).lean();
        },
    },
];

const DATASET_MAP = Object.fromEntries(DATASETS.map(d => [d.key, d]));

module.exports = { DATASETS, DATASET_MAP, DEPARTMENTS, MAX_ROWS };
