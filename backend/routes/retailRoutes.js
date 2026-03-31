const express = require('express');
const router = express.Router();
const { createRetailSale, getAllSales } = require('../controllers/retailController');
const requireAuth = require('../middleware/requireAuth');

router.post('/buy', requireAuth, createRetailSale);
router.get('/', requireAuth, getAllSales);

module.exports = router;
