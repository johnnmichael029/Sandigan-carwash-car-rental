const express = require('express');
const router = express.Router();
const {
    getMaintenanceProjects,
    createMaintenanceProject,
    updateMaintenanceProject,
    completeMaintenanceProject,
    deleteMaintenanceProject
} = require('../controllers/maintenanceController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');

router.use(requireAuth);

router.get('/', getMaintenanceProjects);
router.post('/', adminOnly, createMaintenanceProject);
router.put('/:id', adminOnly, updateMaintenanceProject);
router.delete('/:id', adminOnly, deleteMaintenanceProject);
router.post('/:id/complete', adminOnly, completeMaintenanceProject);

module.exports = router;
