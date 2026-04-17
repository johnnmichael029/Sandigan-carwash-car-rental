const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');
const {
    getBookings,
    getBooking,
    createBooking,
    deleteBooking,
    updateBooking,
    cancelBooking,
    getAvailableTimeSlots,
    getEmployeeHistory,
    updateDetailerLocation
} = require('../controllers/bookingController');
const router = express.Router();

// --- PUBLIC ROUTES ---
router.get('/availability', cache('booking', 30), getAvailableTimeSlots);
router.post('/', (req, res, next) => { invalidatePrefixes('booking', 'forecast', 'finance', 'revenue', 'sandi'); next(); }, createBooking);
router.patch('/:id/cancel', (req, res, next) => { invalidatePrefixes('booking', 'forecast', 'finance', 'revenue', 'sandi'); next(); }, cancelBooking);

// --- PROTECTED ROUTES ---
router.get('/employee-history/:id', requireAuth, cache('booking', 60), getEmployeeHistory);
router.get('/', requireAuth, cache('booking', 60), getBookings);
router.get('/:id', requireAuth, cache('booking', 30), getBooking);
router.patch('/:id', requireAuth, (req, res, next) => { invalidatePrefixes('booking', 'forecast', 'finance', 'revenue', 'sandi'); next(); }, updateBooking);
router.patch('/:id/location', updateDetailerLocation); // Mobile detailer GPS stream - JWT verified inside controller
router.delete('/:id', requireAuth, (req, res, next) => { invalidatePrefixes('booking', 'forecast', 'finance', 'revenue', 'sandi'); next(); }, deleteBooking);

module.exports = router;