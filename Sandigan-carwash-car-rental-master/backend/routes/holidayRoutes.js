const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateHoliday = (req, res, next) => { invalidatePrefixes('holiday', 'payroll', 'attendance'); next(); };

// Holiday list — cached 12 hrs (holidays rarely change)
router.get('/', requireAuth, requirePermission('Workforce', 'read'), cache('holiday', 43200), holidayController.getHolidays);

router.post('/', requireAuth, requirePermission('Workforce', 'create'), invalidateHoliday, holidayController.createHoliday);
router.patch('/:id', requireAuth, requirePermission('Workforce', 'update'), invalidateHoliday, holidayController.updateHoliday);
router.delete('/:id', requireAuth, requirePermission('Workforce', 'delete'), invalidateHoliday, holidayController.deleteHoliday);

module.exports = router;
