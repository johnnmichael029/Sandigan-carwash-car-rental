const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { createRental, getRentals, getRental, updateStatus, updateRental, cancelRental } = require('../controllers/carRentalController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateRental = (req, res, next) => { invalidatePrefixes('rental', 'revenue', 'forecast', 'sandi'); next(); };

// PUBLIC — guest rental submission (invalidates rental list)
router.post('/', invalidateRental, createRental);
router.patch('/:id/cancel', invalidateRental, cancelRental);

// EMPLOYEE/ADMIN — manage rentals
router.get('/', requireAuth, cache('rental', 60), getRentals);
router.get('/:id', requireAuth, cache('rental', 60), getRental);
// Status updates affect revenue — invalidate downstream
router.patch('/:id/status', requireAuth, invalidateRental, updateStatus);
router.put('/:id', requireAuth, invalidateRental, updateRental);

module.exports = router;
