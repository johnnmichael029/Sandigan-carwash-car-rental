const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const { getLedger } = require('../controllers/ledgerController');

// GET /api/ledger — admin-only unified general ledger
router.get('/', requireAuth, adminOnly, getLedger);

module.exports = router;
