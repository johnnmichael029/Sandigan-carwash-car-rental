const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/chatbotController');

// Define the POST route for SANDIBOT interactions
router.post('/', chat);

module.exports = router;
