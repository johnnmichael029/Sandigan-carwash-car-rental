const express = require('express');
const router = express.Router();
const { getAssets, createAsset, updateAsset, deleteAsset, incrementUsageByBay } = require('../controllers/assetController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateAsset = (req, res, next) => { invalidatePrefixes('asset', 'sandi'); next(); };

router.use(requireAuth);

// Assets list — cached 2 min
router.get('/', cache('asset', 120), getAssets);
router.post('/', adminOnly, invalidateAsset, createAsset);
router.put('/:id', adminOnly, invalidateAsset, updateAsset);
router.delete('/:id', adminOnly, invalidateAsset, deleteAsset);
// Usage increment happens per booking completion — short-circuit cache
router.post('/increment-usage/:bayId', adminOnly, invalidateAsset, incrementUsageByBay);

module.exports = router;
