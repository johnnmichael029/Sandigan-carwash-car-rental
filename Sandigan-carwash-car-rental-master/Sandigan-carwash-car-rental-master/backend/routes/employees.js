const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
const superAdminOnly = require('../middleware/superAdminOnly');
=======
const adminOnly = require('../middleware/adminOnly');
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

// Import controller functions
const {
    getEmployee,
    getEmployees,
    createEmployee,
    deleteEmployee,
    updateEmployee,
    loginEmployee,
    logoutEmployee,
    addEvaluation,
    updateSkills,
    backfillEmployeeIds,
    getMyEarnings,
    savePushToken
} = require('../controllers/employeeController');

// --- PUBLIC ROUTES (no auth needed) ---

// ── FIRST-RUN SETUP ──────────────────────────────────────────────────────────
// Check if any admin account exists (used to show/hide the setup page)
router.get('/setup-status', async (req, res) => {
    try {
        const Employee = require('../models/employeeModel');
<<<<<<< HEAD
        const adminCount = await Employee.countDocuments({ role: { $in: ['admin', 'super_admin'] } });
=======
        const adminCount = await Employee.countDocuments({ role: 'admin' });
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
        res.json({ setupRequired: adminCount === 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create the FIRST admin account — only works if no admin exists
router.post('/setup', async (req, res) => {
    try {
        const Employee = require('../models/employeeModel');
<<<<<<< HEAD
        const adminCount = await Employee.countDocuments({ role: { $in: ['admin', 'super_admin'] } });
=======
        const adminCount = await Employee.countDocuments({ role: 'admin' });
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
        if (adminCount > 0) {
            return res.status(403).json({ error: 'Setup already completed. This page is locked.' });
        }
        const { createEmployee } = require('../controllers/employeeController');
<<<<<<< HEAD
        // Force the role to 'super_admin' for the very first account
        req.body.role = 'super_admin';
=======
        // Force the role to 'admin' regardless of what was sent
        req.body.role = 'admin';
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
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

<<<<<<< HEAD
// Create a new employee (sign up - Super Admin only)
router.post('/signup', requireAuth, superAdminOnly, (req, res, next) => { invalidatePrefixes('employee', 'payroll', 'sandi'); next(); }, createEmployee);

// Backfill: Assign IDs to all employees missing one (Super Admin only — run once)
router.post('/backfill-ids', requireAuth, superAdminOnly, backfillEmployeeIds);
=======
// Create a new employee (sign up - restrict to admin)
router.post('/signup', requireAuth, adminOnly, (req, res, next) => { invalidatePrefixes('employee', 'payroll', 'sandi'); next(); }, createEmployee);

// Backfill: Assign IDs to all employees missing one (Admin only — run once)
router.post('/backfill-ids', requireAuth, adminOnly, backfillEmployeeIds);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

// --- PROTECTED ROUTES (require valid JWT) ---

// Get detailer earnings
router.get('/my-earnings', requireAuth, getMyEarnings);

// Save push token (authenticated)
router.post('/push-token', requireAuth, savePushToken);

// Get all employees
<<<<<<< HEAD
router.get('/', requireAuth, requirePermission('Workforce', 'read'), cache('employee', 90), getEmployees);

// Get a single employee
router.get('/:id', requireAuth, requirePermission('Workforce', 'read'), cache('employee', 60), getEmployee);

// Update employee (Workforce update OR Super Admin)
router.patch('/:id', requireAuth, requirePermission('Workforce', 'update'), (req, res, next) => { invalidatePrefixes('employee', 'payroll', 'sandi'); next(); }, updateEmployee);

// Performance and Training (Workforce update permission)
router.post('/:id/evaluation', requireAuth, requirePermission('Workforce', 'update'), (req, res, next) => { invalidatePrefixes('employee'); next(); }, addEvaluation);
router.patch('/:id/skills', requireAuth, requirePermission('Workforce', 'update'), (req, res, next) => { invalidatePrefixes('employee'); next(); }, updateSkills);

// Delete employee (Super Admin only)
router.delete('/:id', requireAuth, superAdminOnly, (req, res, next) => { invalidatePrefixes('employee', 'payroll', 'sandi'); next(); }, deleteEmployee);
=======
router.get('/', requireAuth, cache('employee', 90), getEmployees);

// Get a single employee
router.get('/:id', requireAuth, cache('employee', 60), getEmployee);

// Update employee (Admin only)
router.patch('/:id', requireAuth, adminOnly, (req, res, next) => { invalidatePrefixes('employee', 'payroll', 'sandi'); next(); }, updateEmployee);

// Performance and Training (Admin only)
router.post('/:id/evaluation', requireAuth, adminOnly, (req, res, next) => { invalidatePrefixes('employee'); next(); }, addEvaluation);
router.patch('/:id/skills', requireAuth, adminOnly, (req, res, next) => { invalidatePrefixes('employee'); next(); }, updateSkills);

// Delete employee (Admin only)
router.delete('/:id', requireAuth, adminOnly, (req, res, next) => { invalidatePrefixes('employee', 'payroll', 'sandi'); next(); }, deleteEmployee);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;