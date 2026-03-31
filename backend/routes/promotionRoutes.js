const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');

// All promo routes
router.post('/create', promotionController.createPromotion);
router.get('/all', promotionController.getAllPromotions);
router.patch('/update/:id', promotionController.updatePromotion);
router.delete('/delete/:id', promotionController.deletePromotion);
router.post('/validate', promotionController.validatePromoCode);

module.exports = router;
