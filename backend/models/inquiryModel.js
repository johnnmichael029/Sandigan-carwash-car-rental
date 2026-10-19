const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['Unread', 'Read', 'Replied', 'Archived'],
        default: 'Unread'
    },
    adminNotes: {
        type: String,
        default: ''
    },
    repliedAt: {
        type: Date,
        default: null
    },
    repliedBy: {
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Inquiry', inquirySchema);
