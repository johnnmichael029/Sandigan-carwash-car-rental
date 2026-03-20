const express = require('express');
const {
    getBookings,
    getBooking,
    createBooking,
    deleteBooking,
    updateBooking,
    getAvailableTimeSlots
} = require('../controllers/bookingController');
const router = express.Router();

// // --- PAGE VIEWS (These render EJS) ---
// // Home Page
// router.get('/', (req, res) => {
//     // This is the route for the price list 
//     res.render('public/index', { PriceList: PriceList });
// });
// // Booking Form Page
// router.get('/book', (req, res) => {
//     res.render('public/book'); 
// });

// --- API DATA ROUTES (These return JSON) ---

// Get all bookings
router.get('/availability', getAvailableTimeSlots);

// 2. Get all bookings
// The actual URL will be: /api/booking/
router.get('/', getBookings);

// 3. Get a single booking (The :id must come AFTER availability)
// The actual URL will be: /api/booking/:id
router.get('/:id', getBooking);

// 4. Create a booking
router.post('/', createBooking);

// 5. Delete and Update
router.delete('/:id', deleteBooking);
router.patch('/:id', updateBooking);

module.exports = router;