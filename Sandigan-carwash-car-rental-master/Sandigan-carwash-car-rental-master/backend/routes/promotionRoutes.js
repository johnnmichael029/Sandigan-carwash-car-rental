const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
<<<<<<< HEAD
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
=======
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
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

<<<<<<< HEAD
// Admin / Clientele Mutations
router.post('/create', requireAuth, requirePermission('Clientele', 'create'), invalidatePromos, promotionController.createPromotion);
router.patch('/update/:id', requireAuth, requirePermission('Clientele', 'update'), invalidatePromos, promotionController.updatePromotion);
router.delete('/delete/:id', requireAuth, requirePermission('Clientele', 'delete'), invalidatePromos, promotionController.deletePromotion);
=======
// Mutations
router.post('/create', invalidatePromos, promotionController.createPromotion);
router.patch('/update/:id', invalidatePromos, promotionController.updatePromotion);
router.delete('/delete/:id', invalidatePromos, promotionController.deletePromotion);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
