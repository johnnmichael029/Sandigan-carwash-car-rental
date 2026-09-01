const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    type: {
        type: String,
        default: 'info'
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
