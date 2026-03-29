const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { 
    getPricing, 
    createVehiclePricing, 
    updateVehiclePricing, 
    deleteVehiclePricing 
} = require('../controllers/pricingController');

// GET all prices (public so booking page can use it)
router.get('/', getPricing);

// CRUD routes for Admin
router.post('/', requireAuth, createVehiclePricing);
router.put('/:id', requireAuth, updateVehiclePricing);
router.delete('/:id', requireAuth, deleteVehiclePricing);

module.exports = router;
