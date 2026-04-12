const mongoose = require('mongoose');

const rentalFleetSchema = new mongoose.Schema({
    vehicleName: {
        type: String,
        required: true,
        trim: true
    },
    vehicleType: {
        type: String,
        required: true
    },
    seats: {
        type: Number,
        required: true,
        min: 1
    },
    pricePerDay: {
        type: Number,
        required: true,
        min: 0
    },
    imageBase64: {
        type: String,
        default: null
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    description: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('RentalFleet', rentalFleetSchema);
