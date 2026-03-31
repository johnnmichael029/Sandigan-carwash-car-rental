const express = require('express');
const router = express.Router();
const { getRevenues, createRevenue, deleteRevenue } = require('../controllers/revenueController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');

// All revenue ledger routes are Admin-restricted
router.use(requireAuth, adminOnly);

router.get('/', getRevenues);
router.post('/', createRevenue);
router.delete('/:id', deleteRevenue);

module.exports = router;
