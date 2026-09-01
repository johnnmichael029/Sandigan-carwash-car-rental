const express = require('express');
const router = express.Router();
const { getBays, createBay, updateBay, deleteBay } = require('../controllers/bayController');
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
=======
const adminOnly = require('../middleware/adminOnly');
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateBays = (req, res, next) => { invalidatePrefixes('bays'); next(); };

// Bays are public for live bay monitor — cached 30s
router.get('/', cache('bays', 30), getBays);
<<<<<<< HEAD
router.post('/', requireAuth, requirePermission('Operations', 'create'), invalidateBays, createBay);
router.put('/:id', requireAuth, requirePermission('Operations', 'update'), invalidateBays, updateBay);
router.delete('/:id', requireAuth, requirePermission('Operations', 'delete'), invalidateBays, deleteBay);
=======
router.post('/', requireAuth, adminOnly, invalidateBays, createBay);
router.put('/:id', requireAuth, adminOnly, invalidateBays, updateBay);
router.delete('/:id', requireAuth, adminOnly, invalidateBays, deleteBay);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
