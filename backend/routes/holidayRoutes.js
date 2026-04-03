const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
/**
 * GET all holiday dates
 */
router.get('/', requireAuth, holidayController.getHolidays);

/**
 * POST a new holiday
 */
router.post('/', requireAuth, adminOnly, holidayController.createHoliday);

/**
 * UPDATE a holiday
 */
router.patch('/:id', requireAuth, adminOnly, holidayController.updateHoliday);

/**
 * DELETE a holiday
 */
router.delete('/:id', requireAuth, adminOnly, holidayController.deleteHoliday);

module.exports = router;
