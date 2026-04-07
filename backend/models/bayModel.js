const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const baySchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        enum: ['Standard Wash', 'Motorcycle', 'Detailing', 'General'],
        default: 'Standard Wash'
    },
    status: {
        type: String,
        enum: ['Available', 'Occupied', 'Maintenance', 'Inactive'],
        default: 'Available'
    },
    description: {
        type: String,
        default: ''
    }
}, { timestamps: true });

const Bay = mongoose.model('bay', baySchema);
module.exports = Bay;
