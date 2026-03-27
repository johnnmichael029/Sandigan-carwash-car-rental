const express = require('express');
const {
    getNotifications,
    getNotification,
    createNotification,
    deleteNotification,
    updateNotification,
    markAllRead,
    deleteAllNotifications
} = require('../controllers/notificationController');

const router = express.Router();

// GET all notifications
router.get('/', getNotifications);

// Mark all as read
router.patch('/mark-read', markAllRead);

// Delete all
router.delete('/delete-all', deleteAllNotifications);

// GET a single notification
router.get('/:id', getNotification);

// POST a new notification
router.post('/', createNotification);

// Mark specific notification as read (using the general update or a specific one)
router.patch('/:id/read', (req, res) => {
    req.body.isRead = true;
    updateNotification(req, res);
});

// DELETE a notification
router.delete('/:id', deleteNotification);

// UPDATE a notification (general)
router.patch('/:id', updateNotification);

module.exports = router;
