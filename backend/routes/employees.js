const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const requireAuth = require('../middleware/requireAuth');

// Import controller functions
const {
    getEmployee,
    getEmployees,
    createEmployee,
    deleteEmployee,
    updateEmployee,
    loginEmployee
} = require('../controllers/employeeController');

// --- Rate Limiter for Login (prevent brute force) ---
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // max 10 attempts per window
    message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// --- PUBLIC ROUTES (no auth needed) ---

// Employee login (rate limited)
router.post('/login', loginLimiter, loginEmployee);

// Create a new employee (sign up - keep public or restrict to admin later)
router.post('/signup', createEmployee);

// --- PROTECTED ROUTES (require valid JWT) ---

// Get all employees — sensitive, protect it
router.get('/', requireAuth, getEmployees);

// Get a single employee
router.get('/:id', requireAuth, getEmployee);

// Update employee
router.patch('/:id', requireAuth, updateEmployee);

// Delete employee
router.delete('/:id', requireAuth, deleteEmployee);

module.exports = router;