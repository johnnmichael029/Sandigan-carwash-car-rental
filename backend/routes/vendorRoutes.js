const express = require('express');
const router = express.Router();
const { getAllVendors, createVendor, updateVendor, deleteVendor, getVendorStats } = require('../controllers/vendorController');
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateVendor = (req, res, next) => { invalidatePrefixes('vendor', 'payable'); next(); };

// Vendor list — cached 2 min
router.get('/', requireAuth, requirePermission('Inventory', 'read'), cache('vendor', 120), getAllVendors);
// Vendor stats — cached 90s
router.get('/:id/stats', requireAuth, requirePermission('Inventory', 'read'), cache('vendor', 90), getVendorStats);

router.post('/add', requireAuth, requirePermission('Inventory', 'create'), invalidateVendor, createVendor);
router.put('/:id/update', requireAuth, requirePermission('Inventory', 'update'), invalidateVendor, updateVendor);
router.delete('/:id/delete', requireAuth, requirePermission('Inventory', 'delete'), invalidateVendor, deleteVendor);

module.exports = router;
