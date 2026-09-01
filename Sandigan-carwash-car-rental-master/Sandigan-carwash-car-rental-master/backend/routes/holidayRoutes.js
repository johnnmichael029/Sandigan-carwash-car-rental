const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
=======
const adminOnly = require('../middleware/adminOnly');
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateHoliday = (req, res, next) => { invalidatePrefixes('holiday', 'payroll', 'attendance'); next(); };

// Holiday list — cached 12 hrs (holidays rarely change)
<<<<<<< HEAD
router.get('/', requireAuth, requirePermission('Workforce', 'read'), cache('holiday', 43200), holidayController.getHolidays);

router.post('/', requireAuth, requirePermission('Workforce', 'create'), invalidateHoliday, holidayController.createHoliday);
router.patch('/:id', requireAuth, requirePermission('Workforce', 'update'), invalidateHoliday, holidayController.updateHoliday);
router.delete('/:id', requireAuth, requirePermission('Workforce', 'delete'), invalidateHoliday, holidayController.deleteHoliday);
=======
router.get('/', requireAuth, cache('holiday', 43200), holidayController.getHolidays);

router.post('/', requireAuth, adminOnly, invalidateHoliday, holidayController.createHoliday);
router.patch('/:id', requireAuth, adminOnly, invalidateHoliday, holidayController.updateHoliday);
router.delete('/:id', requireAuth, adminOnly, invalidateHoliday, holidayController.deleteHoliday);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
