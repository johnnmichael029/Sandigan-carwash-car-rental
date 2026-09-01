const express = require('express');
const router = express.Router();
const { getRevenues, createRevenue, deleteRevenue } = require('../controllers/revenueController');
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateRevenue = (req, res, next) => { invalidatePrefixes('revenue', 'forecast', 'finance', 'sandi'); next(); };

router.get('/', requireAuth, requirePermission('Finance', 'read'), cache('revenue', 90), getRevenues);
router.post('/', requireAuth, requirePermission('Finance', 'create'), invalidateRevenue, createRevenue);
router.delete('/:id', requireAuth, requirePermission('Finance', 'delete'), invalidateRevenue, deleteRevenue);

module.exports = router;
