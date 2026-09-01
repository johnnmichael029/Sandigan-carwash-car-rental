const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
    dateStr: { // Format: YYYY-MM-DD
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Regular', 'Special'],
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('holiday', holidaySchema);
