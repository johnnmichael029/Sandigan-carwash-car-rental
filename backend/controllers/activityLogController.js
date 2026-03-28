const ActivityLog = require('../models/activityLogModel');

/* ── Get all activity logs (admin only) ── */
const getActivityLogs = async (req, res) => {
    try {
        const logs = await ActivityLog.find()
            .sort({ createdAt: -1 })
            .limit(200);
        res.status(200).json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ── Mark a single log as read ── */
const markRead = async (req, res) => {
    try {
        const { id } = req.params;
        const log = await ActivityLog.findByIdAndUpdate(id, { isRead: true }, { new: true });
        if (!log) return res.status(404).json({ error: 'Log not found' });
        res.status(200).json(log);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ── Mark all logs as read ── */
const markAllRead = async (req, res) => {
    try {
        await ActivityLog.updateMany({ isRead: false }, { $set: { isRead: true } });
        res.status(200).json({ message: 'All marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ── Delete all logs ── */
const deleteAllLogs = async (req, res) => {
    try {
        await ActivityLog.deleteMany({});
        res.status(200).json({ message: 'All activity logs deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ── Helper: create a log entry (called internally from controllers) ── */
const createLog = async ({ actorId, actorName, actorRole, action, message, bookingId, meta }) => {
    try {
        const log = await ActivityLog.create({ actorId, actorName, actorRole, action, message, bookingId, meta });
        return log;
    } catch (err) {
        // Non-fatal — never block the main operation
        console.error('ActivityLog createLog error:', err.message);
        return null;
    }
};

module.exports = {
    getActivityLogs,
    markRead,
    markAllRead,
    deleteAllLogs,
    createLog,
};
