const ActivityLog = require('../models/activityLogModel');

/* ── Get all activity logs (admin only) ── */
const getActivityLogs = async (req, res) => {
    try {
        const { search = '' } = req.query;
        let query = {};

        if (search && search.trim()) {
            const lowTerm = search.trim();
            const searchRegex = { $regex: lowTerm, $options: 'i' };

            // Check if search term is a month name or abbreviation
            const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
            const monthsShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            
            const monthIndex = months.findIndex(m => m.includes(lowTerm.toLowerCase()));
            const monthShortIndex = monthsShort.findIndex(ms => ms === lowTerm.toLowerCase());
            const targetMonth = monthIndex !== -1 ? monthIndex + 1 : (monthShortIndex !== -1 ? monthShortIndex + 1 : null);

            query = {
                $or: [
                    { actorName: searchRegex },
                    { module: searchRegex },
                    { action: searchRegex },
                    { message: searchRegex },
                    {
                        $expr: {
                            $regexMatch: {
                                input: { $dateToString: { format: "%m/%d/%Y", date: "$createdAt", timezone: "Asia/Manila" } },
                                regex: lowTerm,
                                options: "i"
                            }
                        }
                    }
                ]
            };

            // If it's a numeric partial date like "4/3", add numeric matching
            if (lowTerm.includes('/')) {
                const parts = lowTerm.split('/');
                const m = parseInt(parts[0]);
                const d = parseInt(parts[1]);
                const y = parts[2] ? parseInt(parts[2]) : null;

                if (!isNaN(m) && !isNaN(d)) {
                    const dateMatch = {
                        $and: [
                            { $expr: { $eq: [{ $month: { date: "$createdAt", timezone: "Asia/Manila" } }, m] } },
                            { $expr: { $eq: [{ $dayOfMonth: { date: "$createdAt", timezone: "Asia/Manila" } }, d] } }
                        ]
                    };
                    if (y) {
                        // Allow searching by 2-digit or 4-digit year
                        const yearQuery = y < 100 ? { $expr: { $eq: [{ $mod: [{ $year: { date: "$createdAt", timezone: "Asia/Manila" } }, 100] }, y] } } 
                                                  : { $expr: { $eq: [{ $year: { date: "$createdAt", timezone: "Asia/Manila" } }, y] } };
                        dateMatch.$and.push(yearQuery);
                    }
                    query.$or.push(dateMatch);
                }
            }

            // If search matches a month name, filter by month number
            if (targetMonth) {
                query.$or.push({
                    $expr: { $eq: [{ $month: { date: "$createdAt", timezone: "Asia/Manila" } }, targetMonth] }
                });
            }
        }

        const logs = await ActivityLog.find(query)
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

/* ── Helper: create a log entry ── */
const createLog = async ({ actorId, actorName, actorRole, module = 'SYSTEM', action, message, meta = {} }) => {
    try {
        const log = await ActivityLog.create({ actorId, actorName, actorRole, module, action, message, meta });
        return log;
    } catch (err) {
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
