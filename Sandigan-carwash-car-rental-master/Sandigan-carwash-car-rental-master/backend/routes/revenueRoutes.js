const express = require('express');
const router = express.Router();
const { getRevenues, createRevenue, deleteRevenue } = require('../controllers/revenueController');
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateRevenue = (req, res, next) => { invalidatePrefixes('revenue', 'forecast', 'finance', 'sandi'); next(); };

router.get('/', requireAuth, requirePermission('Finance', 'read'), cache('revenue', 90), getRevenues);
router.post('/', requireAuth, requirePermission('Finance', 'create'), invalidateRevenue, createRevenue);
router.delete('/:id', requireAuth, requirePermission('Finance', 'delete'), invalidateRevenue, deleteRevenue);
=======
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

// All revenue ledger routes are Admin-restricted
router.use(requireAuth, adminOnly);

router.get('/', cache('revenue', 90), getRevenues);
router.post('/', (req, res, next) => { invalidatePrefixes('revenue', 'forecast', 'finance', 'sandi'); next(); }, createRevenue);
router.delete('/:id', (req, res, next) => { invalidatePrefixes('revenue', 'forecast', 'finance', 'sandi'); next(); }, deleteRevenue);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
