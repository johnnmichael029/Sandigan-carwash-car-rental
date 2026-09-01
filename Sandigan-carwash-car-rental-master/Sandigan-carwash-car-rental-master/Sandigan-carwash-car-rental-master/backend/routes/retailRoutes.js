const express = require('express');
const router = express.Router();
const { createRetailSale, getAllSales } = require('../controllers/retailController');
const requireAuth = require('../middleware/requireAuth');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

// Retail sales list — cached 60s
router.get('/', requireAuth, cache('retail', 60), getAllSales);
// New sale — clears retail + inventory (stock used) + revenue (sale generates revenue)
router.post('/buy', requireAuth, (req, res, next) => { invalidatePrefixes('retail', 'inventory', 'revenue', 'forecast', 'sandi'); next(); }, createRetailSale);

module.exports = router;
