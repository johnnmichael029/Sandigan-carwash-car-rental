const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateHoliday = (req, res, next) => { invalidatePrefixes('holiday', 'payroll', 'attendance'); next(); };

// Holiday list — cached 12 hrs (holidays rarely change)
router.get('/', requireAuth, cache('holiday', 43200), holidayController.getHolidays);

router.post('/', requireAuth, adminOnly, invalidateHoliday, holidayController.createHoliday);
router.patch('/:id', requireAuth, adminOnly, invalidateHoliday, holidayController.updateHoliday);
router.delete('/:id', requireAuth, adminOnly, invalidateHoliday, holidayController.deleteHoliday);

module.exports = router;
