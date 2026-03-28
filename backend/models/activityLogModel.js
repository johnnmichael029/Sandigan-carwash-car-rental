const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    // Who performed the action (null for public/system actions)
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'employee', default: null },
    actorName: { type: String, default: 'System' },
    actorRole: { type: String, default: 'system' },

    // What was done
    action: {
        type: String,
        required: true,
        enum: [
            'booking_created',
            'booking_status_changed',
            'booking_updated',
            'booking_deleted',
            'staff_logged_in',
            'staff_logged_out',
        ]
    },

    // Human-readable message shown in Activity Log
    message: { type: String, required: true },

    // Context for linking / drilling down
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    meta: { type: Object, default: {} }, // e.g. { fromStatus: 'Pending', toStatus: 'In-progress' }

    isRead: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
