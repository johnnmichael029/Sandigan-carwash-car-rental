const express = require('express');
const router = express.Router();
const { getRevenues, createRevenue, deleteRevenue } = require('../controllers/revenueController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

// All revenue ledger routes are Admin-restricted
router.use(requireAuth, adminOnly);

router.get('/', cache('revenue', 90), getRevenues);
router.post('/', (req, res, next) => { invalidatePrefixes('revenue', 'forecast', 'finance', 'sandi'); next(); }, createRevenue);
router.delete('/:id', (req, res, next) => { invalidatePrefixes('revenue', 'forecast', 'finance', 'sandi'); next(); }, deleteRevenue);

module.exports = router;
