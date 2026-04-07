const express = require('express');
const router = express.Router();
const { getBays, createBay, updateBay, deleteBay } = require('../controllers/bayController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');


// All routes are currently public for testing, but should be protected with auth/admin middleware later
router.get('/', getBays);
router.post('/', requireAuth, adminOnly, createBay);
router.put('/:id', requireAuth, adminOnly, updateBay);
router.delete('/:id', requireAuth, adminOnly, deleteBay);

module.exports = router;
