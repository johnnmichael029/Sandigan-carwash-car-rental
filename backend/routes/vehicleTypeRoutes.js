const express = require('express');
const router = express.Router();
const { getVehicleTypes, createVehicleType, updateVehicleType, deleteVehicleType } = require('../controllers/vehicleTypeController');
const adminOnly = require('../middleware/adminOnly');
const requireAuth = require('../middleware/requireAuth');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateVehicleType = (req, res, next) => { invalidatePrefixes('vehicle-type', 'pricing'); next(); };

// PUBLIC — vehicle types used on booking form — cached 1 hour
router.get('/', cache('vehicle-type', 3600), getVehicleTypes);

router.post('/', requireAuth, adminOnly, invalidateVehicleType, createVehicleType);
router.patch('/:id', requireAuth, adminOnly, invalidateVehicleType, updateVehicleType);
router.delete('/:id', requireAuth, adminOnly, invalidateVehicleType, deleteVehicleType);

module.exports = router;
