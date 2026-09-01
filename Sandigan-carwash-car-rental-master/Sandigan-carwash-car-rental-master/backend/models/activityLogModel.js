const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    // Who performed the action
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'employee', default: null },
    actorName: { type: String, default: 'System' },
    actorRole: { type: String, default: 'system' },

    // Category
    module: {
        type: String,
        required: true,
<<<<<<< HEAD
        enum: ['BOOKING', 'FINANCE', 'HRIS', 'INVENTORY', 'CRM', 'VENDOR', 'PROMOTIONS', 'SYSTEM', 'LOYALTY'],
=======
        enum: ['BOOKING', 'FINANCE', 'HRIS', 'INVENTORY', 'CRM', 'VENDOR', 'PROMOTIONS', 'SYSTEM'],
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
        default: 'SYSTEM'
    },

    // What was done
    action: {
        type: String,
        required: true,
        // (Note: Enums removed to allow future dynamic features without schema updates, 
        // but modules are still enforced for filtering stability)
    },

    // Human-readable message
    message: { type: String, required: true },

    // Context
    meta: { type: Object, default: {} },
    isRead: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
