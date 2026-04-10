const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { createRental, getRentals, getRental, updateStatus, updateRental } = require('../controllers/carRentalController');

// PUBLIC — guest rental submission
router.post('/', createRental);

// EMPLOYEE/ADMIN — manage rentals
router.get('/', requireAuth, getRentals);
router.get('/:id', requireAuth, getRental);
router.patch('/:id/status', requireAuth, updateStatus);
router.put('/:id', requireAuth, updateRental);

module.exports = router;
