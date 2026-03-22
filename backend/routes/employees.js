const express = require('express');
const router = express.Router();

// Import controller functions
const {
    getEmployee,
    getEmployees,
    createEmployee,
    deleteEmployee,
    updateEmployee,
    loginEmployee
} = require('../controllers/employeeController');
    
// --- API DATA ROUTES (These return JSON) ---

// Get all employees
router.get('/', getEmployees);

// Get a single employee
router.get('/:id', getEmployee);

// Create a new employee
router.post('/signup', createEmployee);

// Employee login
router.post('/login', loginEmployee);

// Delete and Update
router.delete('/:id', deleteEmployee);
router.patch('/:id', updateEmployee);

module.exports = router;