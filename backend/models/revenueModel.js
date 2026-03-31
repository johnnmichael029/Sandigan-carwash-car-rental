const mongoose = require('mongoose');

// Revenue model: auto-generated whenever any transaction is finalized
const revenueSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true  // e.g., "Car Wash — Juan dela Cruz", "SMC Issued — Maria Santos"
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        required: true,
        default: 'Service'
    },
    source: {
        type: String,
        default: 'Booking'
    },
    referenceId: {
        type: String,  // batchId for bookings, smcId for memberships
        default: null
    },
    notes: {
        type: String,
        default: ''
    },
    date: {
        type: Date,
        default: Date.now
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee',
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Revenue', revenueSchema);
