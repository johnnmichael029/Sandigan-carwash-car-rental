const express = require('express');
const router = express.Router();
const {
    getVehicleTypes,
    createVehicleType,
    updateVehicleType,
    deleteVehicleType
} = require('../controllers/vehicleTypeController');
const adminOnly = require('../middleware/adminOnly');
const requireAuth = require('../middleware/requireAuth');


router.get('/', getVehicleTypes);

router.post('/', requireAuth, adminOnly, createVehicleType);
router.patch('/:id', requireAuth, adminOnly, updateVehicleType);
router.delete('/:id', requireAuth, adminOnly, deleteVehicleType);

module.exports = router;
