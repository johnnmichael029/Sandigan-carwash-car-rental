const express = require('express');
const router = express.Router();
const { getBays, createBay, updateBay, deleteBay } = require('../controllers/bayController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateBays = (req, res, next) => { invalidatePrefixes('bays'); next(); };

// Bays are public for live bay monitor — cached 30s
router.get('/', cache('bays', 30), getBays);
router.post('/', requireAuth, adminOnly, invalidateBays, createBay);
router.put('/:id', requireAuth, adminOnly, invalidateBays, updateBay);
router.delete('/:id', requireAuth, adminOnly, invalidateBays, deleteBay);

module.exports = router;
