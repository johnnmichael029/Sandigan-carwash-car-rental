const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const { getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = require('../controllers/inventoryController');

// Admin-only management routes
router.get('/', requireAuth, getInventory); // GET (view stock) is open to all staff for POS/Bookings
router.post('/', requireAuth, adminOnly, addInventoryItem);
router.patch('/:id', requireAuth, adminOnly, updateInventoryItem);
router.delete('/:id', requireAuth, adminOnly, deleteInventoryItem);

module.exports = router;
