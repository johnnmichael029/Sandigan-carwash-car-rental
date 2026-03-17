const express = require('express');
const {
    getBookings,
    getBooking,
    createBooking,
    deleteBooking,
    updateBooking
} = require('../controllers/bookingController');
const PriceList = require('../controllers/priceListController');
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
router.get('/api/booking', getBookings);
router.get('/api/booking/:id', getBooking);
router.post('/api/booking', createBooking);
router.delete('/api/booking/:id', deleteBooking);
router.patch('/api/booking/:id', updateBooking);

module.exports = router;