const express = require('express');
const router = express.Router();
const { getAssets, createAsset, updateAsset, deleteAsset, incrementUsageByBay } = require('../controllers/assetController');
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateAsset = (req, res, next) => { invalidatePrefixes('asset', 'sandi'); next(); };

// Assets list — cached 2 min
router.get('/', requireAuth, requirePermission('Operations', 'read'), cache('asset', 120), getAssets);
router.post('/', requireAuth, requirePermission('Operations', 'create'), invalidateAsset, createAsset);
router.put('/:id', requireAuth, requirePermission('Operations', 'update'), invalidateAsset, updateAsset);
router.delete('/:id', requireAuth, requirePermission('Operations', 'delete'), invalidateAsset, deleteAsset);
// Usage increment happens per booking completion
router.post('/increment-usage/:bayId', requireAuth, requirePermission('Operations', 'update'), invalidateAsset, incrementUsageByBay);

module.exports = router;
