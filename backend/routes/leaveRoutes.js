const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const {
    createLeave,
    getAllLeaves,
    updateLeaveStatus,
    deleteLeave,
    updateLeaveBalances
} = require('../controllers/leaveController');

// File a new leave request (Admin)
router.post('/', requireAuth, adminOnly, createLeave);

// Get all leave records with optional search
router.get('/all', requireAuth, adminOnly, getAllLeaves);

// Approve or Reject a leave request
router.patch('/:id/status', requireAuth, adminOnly, updateLeaveStatus);

// Delete a leave record (rolls back balance + attendance if approved)
router.delete('/:id', requireAuth, adminOnly, deleteLeave);

// Update leave balance allocations for an employee
router.patch('/balances', requireAuth, adminOnly, updateLeaveBalances);

module.exports = router;
