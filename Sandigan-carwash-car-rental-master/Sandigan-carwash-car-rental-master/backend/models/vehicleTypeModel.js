const mongoose = require('mongoose');

const vehicleTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    color: {
        type: String,
        default: '#23A0CE'
    },
    textColor: {
        type: String,
        default: '#FFFFFF'
    }
}, { timestamps: true });

module.exports = mongoose.model('VehicleType', vehicleTypeSchema);
