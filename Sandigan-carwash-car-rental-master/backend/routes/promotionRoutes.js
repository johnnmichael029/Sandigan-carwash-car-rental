const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
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

// Admin / Clientele Mutations
router.post('/create', requireAuth, requirePermission('Clientele', 'create'), invalidatePromos, promotionController.createPromotion);
router.patch('/update/:id', requireAuth, requirePermission('Clientele', 'update'), invalidatePromos, promotionController.updatePromotion);
router.delete('/delete/:id', requireAuth, requirePermission('Clientele', 'delete'), invalidatePromos, promotionController.deletePromotion);

module.exports = router;
