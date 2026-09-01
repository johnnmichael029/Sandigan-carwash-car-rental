const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidatePromos = (req, res, next) => { invalidatePrefixes('promo'); next(); };

const requireCustomerAuth = require('../middleware/requireCustomerAuth');

// All promos — cached 3 min
router.get('/all', cache('promo', 180), promotionController.getAllPromotions);

// Protected Customer Routes
router.get('/mine', requireCustomerAuth, promotionController.getMyVouchers);
router.post('/claim', requireCustomerAuth, promotionController.claimPromotion);

// Validate promo code — cached 60s (same code checked repeatedly during bookings)
router.post('/validate', cache('promo', 60), promotionController.validatePromoCode);

// Mutations
router.post('/create', invalidatePromos, promotionController.createPromotion);
router.patch('/update/:id', invalidatePromos, promotionController.updatePromotion);
router.delete('/delete/:id', invalidatePromos, promotionController.deletePromotion);

module.exports = router;
