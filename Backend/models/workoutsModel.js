const mongoose = require('mongoose');
const { time } = require('node:console');
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    customerName: {
        type: String,
        required: true
    },
    plateNumber: {
        type: String,
        required: true
    },
    service: {
        type: String,
        required: true
    }
}, { timestamps: true });
const Booking = mongoose.model('booking', bookingSchema);

module.exports = Booking;
