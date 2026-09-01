const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const { getLedger } = require('../controllers/ledgerController');
const cache = require('../middleware/cacheMiddleware');

// General Ledger — cached 2 min (read-heavy, expensive aggregation)
router.get('/', requireAuth, adminOnly, cache('ledger', 120), getLedger);

module.exports = router;
