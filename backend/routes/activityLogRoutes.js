const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { getActivityLogs, markRead, markAllRead, deleteAllLogs } = require('../controllers/activityLogController');

// All activity log routes are admin-protected
router.get('/', requireAuth, getActivityLogs);
router.patch('/:id/read', requireAuth, markRead);
router.patch('/mark-read', requireAuth, markAllRead);
router.delete('/delete-all', requireAuth, deleteAllLogs);

module.exports = router;
