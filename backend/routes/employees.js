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