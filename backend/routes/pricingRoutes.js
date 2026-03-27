const express = require('express');
const router = express.Router();
const { getPricing } = require('../controllers/pricingController');

// GET all prices (public so booking page can use it)
router.get('/', getPricing);

module.exports = router;
