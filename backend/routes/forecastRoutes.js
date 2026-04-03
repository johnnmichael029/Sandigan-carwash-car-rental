const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const { getForecast } = require('../controllers/forecastController');

// All forecasting operations require Admin access
router.use(requireAuth, adminOnly);

// GET financial forecasts
router.get('/', getForecast);

module.exports = router;
