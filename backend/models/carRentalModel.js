const mongoose = require('mongoose');

const carRentalSchema = new mongoose.Schema({
    rentalId: {
        type: String,
        required: true,
        unique: true
    },
    // Customer Info
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    contactNumber: {
        type: String,
        required: true,
        trim: true
    },
    emailAddress: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    // Vehicle Info
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RentalFleet',
        required: true
    },
    vehicleName: {
        type: String,
        required: true
    },
    pricePerDay: {
        type: Number,
        required: true
    },
    // Rental Details
    rentalStartDate: {
        type: Date,
        required: true
    },
    returnDate: {
        type: Date,
        required: true
    },
    rentalDays: {
        type: Number,
        required: true,
        min: 1
    },
    estimatedTotal: {
        type: Number,
        required: true
    },
    destination: {
        type: String,
        required: true,
        trim: true
    },
    notes: {
        type: String,
        default: '',
        trim: true
    },
    requirementsAcknowledged: {
        type: Boolean,
        required: true,
        default: false
    },
    // Status Management
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Active', 'Returned', 'Cancelled'],
        default: 'Pending'
    },
    statusLogs: {
        type: [{
            status: String,
            note: { type: String, default: '' },
            timestamp: { type: Date, default: Date.now }
        }],
        default: [{ status: 'Pending' }]
    },
    // Employee who handled the rental
    handledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee',
        default: null
    },
    cancellationReason: {
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('CarRental', carRentalSchema);
