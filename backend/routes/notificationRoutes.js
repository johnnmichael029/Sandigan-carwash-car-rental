const express = require('express');
const router = express.Router();
const { getNotifications, markAllRead, deleteAll, markSingleRead } = require('../controllers/notificationController');
const requireAuth = require('../middleware/requireAuth');

router.use(requireAuth);

router.get('/', getNotifications);
router.patch('/mark-read', markAllRead);
router.patch('/:id/read', markSingleRead);
router.delete('/delete-all', deleteAll);

module.exports = router;
