const express = require('express');
const router = express.Router();
const { getAssets, createAsset, updateAsset, deleteAsset, incrementUsageByBay } = require('../controllers/assetController');
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
=======
const adminOnly = require('../middleware/adminOnly');
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateAsset = (req, res, next) => { invalidatePrefixes('asset', 'sandi'); next(); };

<<<<<<< HEAD
// Assets list — cached 2 min
router.get('/', requireAuth, requirePermission('Operations', 'read'), cache('asset', 120), getAssets);
router.post('/', requireAuth, requirePermission('Operations', 'create'), invalidateAsset, createAsset);
router.put('/:id', requireAuth, requirePermission('Operations', 'update'), invalidateAsset, updateAsset);
router.delete('/:id', requireAuth, requirePermission('Operations', 'delete'), invalidateAsset, deleteAsset);
// Usage increment happens per booking completion
router.post('/increment-usage/:bayId', requireAuth, requirePermission('Operations', 'update'), invalidateAsset, incrementUsageByBay);
=======
router.use(requireAuth);

// Assets list — cached 2 min
router.get('/', cache('asset', 120), getAssets);
router.post('/', adminOnly, invalidateAsset, createAsset);
router.put('/:id', adminOnly, invalidateAsset, updateAsset);
router.delete('/:id', adminOnly, invalidateAsset, deleteAsset);
// Usage increment happens per booking completion — short-circuit cache
router.post('/increment-usage/:bayId', adminOnly, invalidateAsset, incrementUsageByBay);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
