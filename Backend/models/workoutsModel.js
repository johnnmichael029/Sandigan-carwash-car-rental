const mongoose = require('mongoose');
const { time } = require('node:console');
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    emailAddress: {
        type: String,
        required: true
    },
    vehicleType: {
        type: String,
        required: true
    },
    serviceType: {
        type: String,
        required: true
    }
}, { timestamps: true });
const Booking = mongoose.model('booking', bookingSchema);

module.exports = Booking;
