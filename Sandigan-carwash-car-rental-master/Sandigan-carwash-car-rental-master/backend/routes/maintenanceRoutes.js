const express = require('express');
const router = express.Router();
const { getMaintenanceProjects, createMaintenanceProject, updateMaintenanceProject, completeMaintenanceProject, deleteMaintenanceProject } = require('../controllers/maintenanceController');
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
=======
const adminOnly = require('../middleware/adminOnly');
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateMaintenance = (req, res, next) => { invalidatePrefixes('maintenance', 'sandi'); next(); };

<<<<<<< HEAD
// Maintenance projects — cached 2 min
router.get('/', requireAuth, requirePermission('Operations', 'read'), cache('maintenance', 120), getMaintenanceProjects);
router.post('/', requireAuth, requirePermission('Operations', 'create'), invalidateMaintenance, createMaintenanceProject);
router.put('/:id', requireAuth, requirePermission('Operations', 'update'), invalidateMaintenance, updateMaintenanceProject);
router.delete('/:id', requireAuth, requirePermission('Operations', 'delete'), invalidateMaintenance, deleteMaintenanceProject);
router.post('/:id/complete', requireAuth, requirePermission('Operations', 'update'), invalidateMaintenance, completeMaintenanceProject);
=======
router.use(requireAuth);

// Maintenance projects — cached 2 min
router.get('/', cache('maintenance', 120), getMaintenanceProjects);
router.post('/', adminOnly, invalidateMaintenance, createMaintenanceProject);
router.put('/:id', adminOnly, invalidateMaintenance, updateMaintenanceProject);
router.delete('/:id', adminOnly, invalidateMaintenance, deleteMaintenanceProject);
router.post('/:id/complete', adminOnly, invalidateMaintenance, completeMaintenanceProject);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
