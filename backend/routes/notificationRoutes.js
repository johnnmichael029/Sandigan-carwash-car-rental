const express = require('express');
const { getNotifications, getNotification, createNotification, deleteNotification, updateNotification, markAllRead, deleteAllNotifications } = require('../controllers/notificationController');
const router = express.Router();
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateNotif = (req, res, next) => { invalidatePrefixes('notif'); next(); };

// Notifications — short 20s TTL (real-time feel)
router.get('/', cache('notif', 20), getNotifications);
router.get('/:id', cache('notif', 20), getNotification);

router.patch('/mark-read', invalidateNotif, markAllRead);
router.delete('/delete-all', invalidateNotif, deleteAllNotifications);
router.post('/', invalidateNotif, createNotification);
router.patch('/:id/read', invalidateNotif, (req, res) => { req.body.isRead = true; updateNotification(req, res); });
router.delete('/:id', invalidateNotif, deleteNotification);
router.patch('/:id', invalidateNotif, updateNotification);

module.exports = router;
