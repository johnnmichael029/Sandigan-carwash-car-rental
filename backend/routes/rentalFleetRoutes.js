const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const { getFleet, getFleetAdmin, createVehicle, updateVehicle, deleteVehicle } = require('../controllers/rentalFleetController');

// PUBLIC — landing page fetches available vehicles (no auth needed)
router.get('/', getFleet);

// ADMIN — manage the full fleet (all vehicles including unavailable)
router.get('/admin', requireAuth, adminOnly, getFleetAdmin);
router.post('/', requireAuth, adminOnly, createVehicle);
router.put('/:id', requireAuth, adminOnly, updateVehicle);
router.delete('/:id', requireAuth, adminOnly, deleteVehicle);

module.exports = router;
