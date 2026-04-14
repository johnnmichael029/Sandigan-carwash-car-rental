const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { getActivityLogs, markRead, markAllRead, deleteAllLogs } = require('../controllers/activityLogController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateLogs = (req, res, next) => { invalidatePrefixes('logs'); next(); };

// Activity logs — cached 30s (new activity can arrive quickly)
router.get('/', requireAuth, cache('logs', 30), getActivityLogs);
router.patch('/:id/read', requireAuth, invalidateLogs, markRead);
router.patch('/mark-read', requireAuth, invalidateLogs, markAllRead);
router.delete('/delete-all', requireAuth, invalidateLogs, deleteAllLogs);

module.exports = router;
