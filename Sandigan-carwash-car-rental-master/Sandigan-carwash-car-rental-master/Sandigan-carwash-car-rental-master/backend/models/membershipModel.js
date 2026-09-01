const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
    cardId: { type: String, required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null }, // Link to 'Walk-in' profile or real profile
    customerName: { type: String, default: 'Walk-in Customer' }, // Cache for easy reading
    issuedDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    status: { type: String, enum: ['Active', 'Expired', 'Cancelled'], default: 'Active' },
    isAssigned: { type: Boolean, default: false } // True if customer info was actually provided
}, { timestamps: true });

module.exports = mongoose.model('Membership', membershipSchema);
