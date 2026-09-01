const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const { getFleet, getFleetAdmin, createVehicle, updateVehicle, deleteVehicle } = require('../controllers/rentalFleetController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateFleet = (req, res, next) => { invalidatePrefixes('fleet', 'rental', 'sandi'); next(); };

// PUBLIC — landing page fetches available vehicles — cached 3 min
router.get('/', cache('fleet', 180), getFleet);

// ADMIN — full fleet list — cached 2 min
router.get('/admin', requireAuth, adminOnly, cache('fleet', 120), getFleetAdmin);

router.post('/', requireAuth, adminOnly, invalidateFleet, createVehicle);
router.put('/:id', requireAuth, adminOnly, invalidateFleet, updateVehicle);
router.delete('/:id', requireAuth, adminOnly, invalidateFleet, deleteVehicle);

module.exports = router;
