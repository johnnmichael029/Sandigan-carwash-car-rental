const express = require('express');
const router = express.Router();
const { getAssets, createAsset, updateAsset, deleteAsset, incrementUsageByBay } = require('../controllers/assetController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');

router.use(requireAuth);

router.get('/', getAssets);
router.post('/', adminOnly, createAsset);
router.put('/:id', adminOnly, updateAsset);
router.delete('/:id', adminOnly, deleteAsset);
router.post('/increment-usage/:bayId', adminOnly, incrementUsageByBay);

module.exports = router;
