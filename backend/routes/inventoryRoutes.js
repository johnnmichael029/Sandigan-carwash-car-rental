const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = require('../controllers/inventoryController');

// All inventory routes require admin auth
router.get('/', requireAuth, getInventory);
router.post('/', requireAuth, addInventoryItem);
router.patch('/:id', requireAuth, updateInventoryItem);
router.delete('/:id', requireAuth, deleteInventoryItem);

module.exports = router;
