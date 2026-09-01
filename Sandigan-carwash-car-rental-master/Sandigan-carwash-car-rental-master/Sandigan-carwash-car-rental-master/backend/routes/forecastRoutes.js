const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const { getForecast } = require('../controllers/forecastController');
const cache = require('../middleware/cacheMiddleware');

// All forecasting operations require Admin access
router.use(requireAuth, adminOnly);

// GET financial forecasts — cached 5 min (expensive calculation)
router.get('/', cache('forecast', 300), getForecast);

module.exports = router;
