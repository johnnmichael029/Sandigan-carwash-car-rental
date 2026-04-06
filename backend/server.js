if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const mongoose = require('mongoose');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);

// Trust proxy for Azure/Proxy environments (required for express-rate-limit)
app.set('trust proxy', 1);

const port = process.env.PORT || 4000;
const dbURI = process.env.MONGODB_URI;

// Import routes
const bookingRoutes = require('./routes/bookingRoutes');
const employeeRoutes = require('./routes/employees');
const notificationRoutes = require('./routes/notificationRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const financeRoutes = require('./routes/financeRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const serviceRecipeRoutes = require('./routes/serviceRecipeRoutes');
const productRoutes = require('./routes/productRoutes');
const recurringBillRoutes = require('./routes/recurringBillRoutes');
const crmRoutes = require('./routes/crmRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const revenueRoutes = require('./routes/revenueRoutes');
const inventoryCategoryRoutes = require('./routes/inventoryCategoryRoutes');
const retailRoutes = require('./routes/retailRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const payableRoutes = require('./routes/payableRoutes');
const billCategoryRoutes = require('./routes/billCategoryRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const forecastRoutes = require('./routes/forecastRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');

const path = require('path');

// Middleware
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { doubleCsrf } = require('csrf-csrf');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// ─────────────────────────────────────────────────────────────────────────────
//   HELMET — Sets secure HTTP response headers
// ─────────────────────────────────────────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ─────────────────────────────────────────────────────────────────────────────
//   CORS — Must be before Rate Limiters so OPTIONS requests pass through safely
// ─────────────────────────────────────────────────────────────────────────────
app.use(cors({
    origin: ['http://localhost:5173', 'https://sandigan-carwash-carrental-akd8a6cde6hpg4cc.japaneast-01.azurewebsites.net'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
}));

// ─────────────────────────────────────────────────────────────────────────────
//  RATE LIMITERS — Prevent brute-force and DDoS attacks
// ─────────────────────────────────────────────────────────────────────────────

// 1. Login limiter
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true, legacyHeaders: false,
});

// 2. Booking creation limiter
const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 requests
    message: { error: 'Too many booking requests. Please try again later.' },
    standardHeaders: true, legacyHeaders: false,
});

// 3. General API limiter
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 200 : 1000, // 200 requests
    message: { error: 'Too many requests from this IP. Please slow down.' },
    standardHeaders: true, legacyHeaders: false,
});

// Apply the general limiter globally to all /api/* routes
app.use('/api/', generalLimiter);

const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'https://sandigan-carwash-carrental-akd8a6cde6hpg4cc.japaneast-01.azurewebsites.net'],
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
        credentials: true
    }
});
app.set('io', io);
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // This is for parsing JSON bodies in POST requests
app.use(cookieParser()); // <--- Required for CSRF protection and authentication

// --- CSRF Protection (Double Submit Cookie Pattern) ---
const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
    getSecret: () => process.env.JWT_SECRET || 'csrf-fallback-secret',
    cookieName: 'csrf',
    cookieOptions: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    },
    // csrf-csrf v3+ requires getSessionIdentifier. For stateless JWT/guest apps, returning a static string or an anon identifier is completely fine:
    getSessionIdentifier: (req) => 'stateless',
    getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

// Endpoint to obtain a CSRF token (called by the frontend before any mutating request)
app.get('/api/csrf-token', (req, res) => {
    const token = generateCsrfToken(req, res);
    res.json({ csrfToken: token });
});

// Apply CSRF protection globally — safe methods (GET, HEAD) are skipped automatically
app.use(doubleCsrfProtection);

const pricingRoutes = require('./routes/pricingRoutes');

// ─────────────────────────────────────────────────────────────────────────────
//  ROUTES  (with targeted rate limiting applied at the route level)
// ─────────────────────────────────────────────────────────────────────────────

// Car wash bookings: POST creation limited to 20/hr; other methods (GET, PATCH) use the general 200/15min limit
app.post('/api/booking', bookingLimiter);
app.use('/api/booking', bookingRoutes);

// Employees: login endpoint limited to 10 attempts per 15 minutes per IP
app.post('/api/employees/login', loginLimiter);
app.use('/api/employees', employeeRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/inventory-categories', inventoryCategoryRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/service-recipes', serviceRecipeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/recurring-bills', recurringBillRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/payroll', require('./routes/payrollRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/retail', retailRoutes);
app.use('/api/settings', require('./routes/settingRoutes'));
app.use('/api/revenue-categories', require('./routes/revenueCategoryRoutes'));
app.use('/api/vendors', vendorRoutes);
app.use('/api/payables', payableRoutes);
app.use('/api/bill-categories', billCategoryRoutes);
app.use('/api/holidays', require('./routes/holidayRoutes'));
app.use('/api/budgets', budgetRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/leaves', require('./routes/leaveRoutes'));
app.use('/api/purchase-orders', require('./routes/purchaseOrderRoutes'));
app.use('/api/stock-movements', require('./routes/stockMovementRoutes'));

// --- Custom Error Handler for CSRF and other Errors ---
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        // Log locally for debugging but don't crash
        console.warn(`[CSRF] Invalid token for ${req.method} ${req.originalUrl}`);
        return res.status(403).json({ error: 'Form security verification failed. Please refresh the page.' });
    }
    // General error handling
    console.error(`[SERVER_ERROR] ${err.message}`);
    res.status(err.status || 500).json({ error: err.message || 'An internal server error occurred' });
});



// Listen on PORT
server.listen(port, () => {
    console.log(`✅ Server live at http://localhost:${port}`);
});

// Connect to MongoDB Atlas
mongoose.connect(dbURI)
    .then(async () => {
        console.log('✅ Connected to MongoDB Atlas!');

        // ── One-time DB cleanup: Fix empty-string emails that break sparse unique index ──
        try {
            const Employee = require('./models/employeeModel');
            const result = await Employee.updateMany(
                { email: '' },
                { $set: { email: null } }
            );
            if (result.modifiedCount > 0) {
                console.log(`🔧 [STARTUP FIX] Converted ${result.modifiedCount} empty-string email(s) to null for sparse index compatibility.`);
            }
        } catch (cleanupErr) {
            console.warn('[STARTUP FIX] Email cleanup skipped:', cleanupErr.message);
        }
    })
    .catch(err => {
        console.error('❌ Database connection error:', err);
        process.exit(1); // This stops the "infinite loading" if the database fails
    });
