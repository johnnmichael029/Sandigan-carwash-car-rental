const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee',
        required: true
    },
    leaveType: {
        type: String,
        enum: ['Sick Leave', 'Vacation Leave', 'Unpaid Leave'],
        required: true
    },
    startDate: {
        type: String, // YYYY-MM-DD local date string
        required: true
    },
    endDate: {
        type: String, // YYYY-MM-DD local date string
        required: true
    },
    totalDays: {
        type: Number,
        default: 1
    },
    reason: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    adminRemarks: {
        type: String,
        default: ''
    },
    // Track which attendance logs were generated upon approval
    generatedAttendanceIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'attendance'
    }],
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee'
    }
}, { timestamps: true });

module.exports = mongoose.model('leave', leaveSchema);
