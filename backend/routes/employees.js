const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');

// Import controller functions
const {
    getEmployee,
    getEmployees,
    createEmployee,
    deleteEmployee,
    updateEmployee,
    loginEmployee,
    logoutEmployee
} = require('../controllers/employeeController');

// --- PUBLIC ROUTES (no auth needed) ---

// ── FIRST-RUN SETUP ──────────────────────────────────────────────────────────
// Check if any admin account exists (used to show/hide the setup page)
router.get('/setup-status', async (req, res) => {
    try {
        const Employee = require('../models/employeeModel');
        const adminCount = await Employee.countDocuments({ role: 'admin' });
        res.json({ setupRequired: adminCount === 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create the FIRST admin account — only works if no admin exists
router.post('/setup', async (req, res) => {
    try {
        const Employee = require('../models/employeeModel');
        const adminCount = await Employee.countDocuments({ role: 'admin' });
        if (adminCount > 0) {
            return res.status(403).json({ error: 'Setup already completed. This page is locked.' });
        }
        const { createEmployee } = require('../controllers/employeeController');
        // Force the role to 'admin' regardless of what was sent
        req.body.role = 'admin';
        return createEmployee(req, res);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─────────────────────────────────────────────────────────────────────────────

// Employee login (rate limited — 10 attempts per 15 mins, defined centrally in server.js)
router.post('/login', loginEmployee);

// Employee logout (clears the auth cookie)
router.post('/logout', logoutEmployee);

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