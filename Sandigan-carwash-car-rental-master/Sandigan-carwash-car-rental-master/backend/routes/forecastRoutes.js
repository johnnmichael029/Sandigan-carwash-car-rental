const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
const { getForecast } = require('../controllers/forecastController');
const cache = require('../middleware/cacheMiddleware');

// GET financial forecasts — cached 5 min (expensive calculation)
router.get('/', requireAuth, requirePermission('Finance', 'read'), cache('forecast', 300), getForecast);
=======
const adminOnly = require('../middleware/adminOnly');
const { getForecast } = require('../controllers/forecastController');
const cache = require('../middleware/cacheMiddleware');

// All forecasting operations require Admin access
router.use(requireAuth, adminOnly);

// GET financial forecasts — cached 5 min (expensive calculation)
router.get('/', cache('forecast', 300), getForecast);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
