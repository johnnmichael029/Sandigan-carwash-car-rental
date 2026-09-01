const express = require('express');
const router = express.Router();
const { getVehicleTypes, createVehicleType, updateVehicleType, deleteVehicleType } = require('../controllers/vehicleTypeController');
<<<<<<< HEAD
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');


=======
const adminOnly = require('../middleware/adminOnly');
const requireAuth = require('../middleware/requireAuth');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const invalidateVehicleType = (req, res, next) => { invalidatePrefixes('vehicle-type', 'pricing'); next(); };

// PUBLIC — vehicle types used on booking form — cached 1 hour
router.get('/', cache('vehicle-type', 3600), getVehicleTypes);

<<<<<<< HEAD
router.post('/', requireAuth, requirePermission('Operations', 'create'), invalidateVehicleType, createVehicleType);
router.patch('/:id', requireAuth, requirePermission('Operations', 'update'), invalidateVehicleType, updateVehicleType);
router.delete('/:id', requireAuth, requirePermission('Operations', 'delete'), invalidateVehicleType, deleteVehicleType);

=======
router.post('/', requireAuth, adminOnly, invalidateVehicleType, createVehicleType);
router.patch('/:id', requireAuth, adminOnly, invalidateVehicleType, updateVehicleType);
router.delete('/:id', requireAuth, adminOnly, invalidateVehicleType, deleteVehicleType);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
