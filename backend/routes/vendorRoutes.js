const express = require('express');
const router = express.Router();
const { getAllVendors, createVendor, updateVendor, deleteVendor, getVendorStats } = require('../controllers/vendorController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');

// 1. Fetch overall vendor list (with totals)
router.get('/', requireAuth, getAllVendors);

// 2. Fetch specific vendor with full bill history
router.get('/:id/stats', requireAuth, adminOnly, getVendorStats);

// 3. CRUD for vendors
router.post('/add', requireAuth, adminOnly, createVendor);
router.put('/:id/update', requireAuth, adminOnly, updateVendor);
router.delete('/:id/delete', requireAuth, adminOnly, deleteVendor);

module.exports = router;
