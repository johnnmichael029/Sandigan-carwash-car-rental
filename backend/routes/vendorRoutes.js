const express = require('express');
const router = express.Router();
const { getAllVendors, createVendor, updateVendor, deleteVendor, getVendorStats } = require('../controllers/vendorController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateVendor = (req, res, next) => { invalidatePrefixes('vendor', 'payable'); next(); };

// Vendor list — cached 2 min
router.get('/', requireAuth, cache('vendor', 120), getAllVendors);
// Vendor stats — cached 90s
router.get('/:id/stats', requireAuth, adminOnly, cache('vendor', 90), getVendorStats);

router.post('/add', requireAuth, adminOnly, invalidateVendor, createVendor);
router.put('/:id/update', requireAuth, adminOnly, invalidateVendor, updateVendor);
router.delete('/:id/delete', requireAuth, adminOnly, invalidateVendor, deleteVendor);

module.exports = router;
