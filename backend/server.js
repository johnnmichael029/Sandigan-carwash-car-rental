if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const mongoose = require('mongoose');
const express = require('express');
const app = express();
const port = process.env.PORT // 8080
const dbURI = process.env.MONGODB_URI;

// Import routes
const workoutsRoutes = require('./routes/workouts');

// Import employee routes
const employeeRoutes = require('./routes/employees');

const path = require('path');

// Middleware
const cors = require('cors'); // 1. Import it
const cookieParser = require('cookie-parser');
const { doubleCsrf } = require('csrf-csrf');

app.use(cors({
    origin: ['http://localhost:5173', 'https://sandigan-carwash-carrental-akd8a6cde6hpg4cc.japaneast-01.azurewebsites.net'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
})); // 2. Use it as middleware
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // This is for parsing JSON bodies in POST requests

// --- CSRF Protection (Double Submit Cookie Pattern) ---
const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
    getSecret: () => process.env.JWT_SECRET || 'csrf-fallback-secret',
    cookieName: 'csrf',
    cookieOptions: {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    },
    getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

// Endpoint to obtain a CSRF token (called by the frontend before any mutating request)
app.get('/api/csrf-token', (req, res) => {
    const token = generateCsrfToken(req, res);
    res.json({ csrfToken: token });
});

// Apply CSRF protection globally — safe methods (GET, HEAD) are skipped automatically
app.use(doubleCsrfProtection);

app.use('/api/booking', workoutsRoutes); // Use the workouts routes for all requests to the root URL
app.use('/api/employees', employeeRoutes); // Use the employee routes for all requests to the /api/employees URL

// Listen on PORT 8080
app.listen(port, () => {
    console.log(`✅ Server live at http://localhost:${port}`);
});

// Connect to MongoDB Atlas
mongoose.connect(dbURI)
    .then(() => console.log('✅ Connected to MongoDB Atlas!'))
    .catch(err => {
        console.error('❌ Database connection error:', err);
        process.exit(1); // This stops the "infinite loading" if the database fails
    });
