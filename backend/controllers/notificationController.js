const Notification = require('../models/notificationModel');

// Get all notifications
const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (err) {
        res.status(500).json({ error: "Error fetching notifications." });
    }
};

// Mark all as read
const markAllRead = async (req, res) => {
    try {
        await Notification.updateMany({ isRead: false }, { isRead: true });
        res.status(200).json({ message: "All notifications marked as read." });
    } catch (err) {
        res.status(500).json({ error: "Error updating notifications." });
    }
};

// Delete all
const deleteAll = async (req, res) => {
    try {
        await Notification.deleteMany({});
        res.status(200).json({ message: "All notifications deleted." });
    } catch (err) {
        res.status(500).json({ error: "Error deleting notifications." });
    }
};

// Mark single as read
const markSingleRead = async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.status(200).json({ message: "Notification marked as read." });
    } catch (err) {
        res.status(500).json({ error: "Error updating notification." });
    }
};

module.exports = { getNotifications, markAllRead, deleteAll, markSingleRead };
