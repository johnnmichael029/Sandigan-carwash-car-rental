const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee',
        required: true
    },
    dateStr: { // Local date string e.g., '2026-03-29' mapped to their timezone
        type: String,
        required: true
    },
    clockInTime: {
        type: Date,
        required: true
    },
    clockOutTime: {
        type: Date
    },
    durationMinutes: {
        type: Number,
        default: 0
    },
    overtimeMinutes: {
        type: Number,
        default: 0
    },
    isOTApproved: {
        type: Boolean,
        default: false
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee'
    },
    holidayType: {
        type: String,
        enum: ['Regular', 'Special', 'None'],
        default: 'None'
    },
    holidayName: {
        type: String,
        default: ''
    },
    wasPresentYesterday: {
        type: Boolean,
        default: false
    },
    // Leave-generated attendance marker
    isLeave: {
        type: Boolean,
        default: false
    },
    leaveType: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Ensure an employee only has one primary attendance record per day
attendanceSchema.index({ employee: 1, dateStr: 1 }, { unique: true });

module.exports = mongoose.model('attendance', attendanceSchema);
