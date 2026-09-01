const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const { getForecast } = require('../controllers/forecastController');
const cache = require('../middleware/cacheMiddleware');

// GET financial forecasts — cached 5 min (expensive calculation)
router.get('/', requireAuth, requirePermission('Finance', 'read'), cache('forecast', 300), getForecast);

module.exports = router;
