const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const { getFleet, getFleetAdmin, createVehicle, updateVehicle, deleteVehicle } = require('../controllers/rentalFleetController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateFleet = (req, res, next) => { invalidatePrefixes('fleet', 'rental', 'sandi'); next(); };

// PUBLIC — landing page fetches available vehicles — cached 3 min
router.get('/', cache('fleet', 180), getFleet);

// ADMIN/OPERATIONS — full fleet list — cached 2 min
router.get('/admin', requireAuth, requirePermission('Operations', 'read'), cache('fleet', 120), getFleetAdmin);

router.post('/', requireAuth, requirePermission('Operations', 'create'), invalidateFleet, createVehicle);
router.put('/:id', requireAuth, requirePermission('Operations', 'update'), invalidateFleet, updateVehicle);
router.delete('/:id', requireAuth, requirePermission('Operations', 'delete'), invalidateFleet, deleteVehicle);

module.exports = router;
