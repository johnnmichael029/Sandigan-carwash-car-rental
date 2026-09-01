const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
=======
const adminOnly = require('../middleware/adminOnly');
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const { getLedger } = require('../controllers/ledgerController');
const cache = require('../middleware/cacheMiddleware');

// General Ledger — cached 2 min (read-heavy, expensive aggregation)
<<<<<<< HEAD
router.get('/', requireAuth, requirePermission('Finance', 'read'), cache('ledger', 120), getLedger);
=======
router.get('/', requireAuth, adminOnly, cache('ledger', 120), getLedger);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
