const express = require('express');
const router = express.Router();
const { getMaintenanceProjects, createMaintenanceProject, updateMaintenanceProject, completeMaintenanceProject, deleteMaintenanceProject } = require('../controllers/maintenanceController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateMaintenance = (req, res, next) => { invalidatePrefixes('maintenance', 'sandi'); next(); };

router.use(requireAuth);

// Maintenance projects — cached 2 min
router.get('/', cache('maintenance', 120), getMaintenanceProjects);
router.post('/', adminOnly, invalidateMaintenance, createMaintenanceProject);
router.put('/:id', adminOnly, invalidateMaintenance, updateMaintenanceProject);
router.delete('/:id', adminOnly, invalidateMaintenance, deleteMaintenanceProject);
router.post('/:id/complete', adminOnly, invalidateMaintenance, completeMaintenanceProject);

module.exports = router;
