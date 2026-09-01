const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const { getLedger } = require('../controllers/ledgerController');
const cache = require('../middleware/cacheMiddleware');

// General Ledger — cached 2 min (read-heavy, expensive aggregation)
router.get('/', requireAuth, requirePermission('Finance', 'read'), cache('ledger', 120), getLedger);

module.exports = router;
