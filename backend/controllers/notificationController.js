const Notification = require('../models/notificationModel');
const mongoose = require('mongoose');

// get all notifications
const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({}).sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// get a single notification
const getNotification = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such notification' });
    }

    const notification = await Notification.findById(id);

    if (!notification) {
        return res.status(404).json({ error: 'No such notification' });
    }

    res.status(200).json(notification);
};

// create a new notification (mostly used internally by bookingController, but helpful here)
const createNotification = async (req, res) => {
    const { message, isRead, type } = req.body;

    try {
        const notification = await Notification.create({ message, isRead, type });
        // Emit to socket if desired
        const io = req.app.get('io');
        if (io) {
            io.emit('new_notification', notification);
        }
        res.status(200).json(notification);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// update a notification (e.g. mark as read)
const updateNotification = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such notification' });
    }

    const notification = await Notification.findOneAndUpdate(
        { _id: id },
        { ...req.body },
        { new: true }
    );

    if (!notification) {
        return res.status(404).json({ error: 'No such notification' });
    }

    res.status(200).json(notification);
};

// delete a notification
const deleteNotification = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such notification' });
    }

    const notification = await Notification.findOneAndDelete({ _id: id });

    if (!notification) {
        return res.status(404).json({ error: 'No such notification' });
    }

    res.status(200).json(notification);
};

// mark all notifications as read
const markAllRead = async (req, res) => {
    try {
        await Notification.updateMany({ isRead: false }, { isRead: true });
        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// delete all notifications
const deleteAllNotifications = async (req, res) => {
    try {
        await Notification.deleteMany({});
        res.status(200).json({ message: 'All notifications deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getNotifications,
    getNotification,
    createNotification,
    deleteNotification,
    updateNotification,
    markAllRead,
    deleteAllNotifications
};
