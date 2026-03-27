const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
    getBookings,
    getBooking,
    createBooking,
    deleteBooking,
    updateBooking,
    getAvailableTimeSlots
} = require('../controllers/bookingController');
const router = express.Router();

// --- PUBLIC ROUTES (customers don't need to log in to book) ---

// Check available time slots (public — used on booking form)
router.get('/availability', getAvailableTimeSlots);

// Create a booking (public — customers submit this)
router.post('/', createBooking);

// --- PROTECTED ROUTES (employee or admin only) ---

// Get all bookings — employees only
router.get('/', requireAuth, getBookings);

// Get a single booking — employees only
router.get('/:id', requireAuth, getBooking);

// Update booking status — employees only
router.patch('/:id', requireAuth, updateBooking);

// Delete a booking — employees only
router.delete('/:id', requireAuth, deleteBooking);

module.exports = router;