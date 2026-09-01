const express = require('express');
const router = express.Router();
const { getMaintenanceProjects, createMaintenanceProject, updateMaintenanceProject, completeMaintenanceProject, deleteMaintenanceProject } = require('../controllers/maintenanceController');
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateMaintenance = (req, res, next) => { invalidatePrefixes('maintenance', 'sandi'); next(); };

// Maintenance projects — cached 2 min
router.get('/', requireAuth, requirePermission('Operations', 'read'), cache('maintenance', 120), getMaintenanceProjects);
router.post('/', requireAuth, requirePermission('Operations', 'create'), invalidateMaintenance, createMaintenanceProject);
router.put('/:id', requireAuth, requirePermission('Operations', 'update'), invalidateMaintenance, updateMaintenanceProject);
router.delete('/:id', requireAuth, requirePermission('Operations', 'delete'), invalidateMaintenance, deleteMaintenanceProject);
router.post('/:id/complete', requireAuth, requirePermission('Operations', 'update'), invalidateMaintenance, completeMaintenanceProject);

module.exports = router;
