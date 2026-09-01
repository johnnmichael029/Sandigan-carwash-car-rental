const express = require('express');
const router = express.Router();
const { getVehicleTypes, createVehicleType, updateVehicleType, deleteVehicleType } = require('../controllers/vehicleTypeController');
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');


const invalidateVehicleType = (req, res, next) => { invalidatePrefixes('vehicle-type', 'pricing'); next(); };

// PUBLIC — vehicle types used on booking form — cached 1 hour
router.get('/', cache('vehicle-type', 3600), getVehicleTypes);

router.post('/', requireAuth, requirePermission('Operations', 'create'), invalidateVehicleType, createVehicleType);
router.patch('/:id', requireAuth, requirePermission('Operations', 'update'), invalidateVehicleType, updateVehicleType);
router.delete('/:id', requireAuth, requirePermission('Operations', 'delete'), invalidateVehicleType, deleteVehicleType);


module.exports = router;
