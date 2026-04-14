const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { getPricing, createVehiclePricing, updateVehiclePricing, deleteVehiclePricing } = require('../controllers/pricingController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidatePricing = (req, res, next) => { invalidatePrefixes('pricing'); next(); };

// Pricing is public (used on booking page) — cached 1 hour (rarely changes)
router.get('/', cache('pricing', 3600), getPricing);

router.post('/', requireAuth, invalidatePricing, createVehiclePricing);
router.put('/:id', requireAuth, invalidatePricing, updateVehiclePricing);
router.delete('/:id', requireAuth, invalidatePricing, deleteVehiclePricing);

module.exports = router;