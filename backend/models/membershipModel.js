const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
    cardId: { type: String, required: true, unique: true },
    cardType: { type: String, enum: ['SMC', 'Loyalty'], default: 'SMC' }, // SMC = premium paid membership; Loyalty = free stamp card
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null }, // Link to 'Walk-in' profile or real profile
    customerName: { type: String, default: 'Walk-in Customer' }, // Cache for easy reading
    issuedDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, default: null }, // Optional, null = never expires
    status: { type: String, enum: ['Active', 'Expired', 'Cancelled'], default: 'Active' },
    isAssigned: { type: Boolean, default: false }, // True if customer info was actually provided

    // ── Loyalty Stamps ────────────────────────────────────────────────────────
    stampCount:         { type: Number, default: 0 },        // Current stamps toward next reward (resets after reward)
    totalStampsEarned:  { type: Number, default: 0 },        // Lifetime total stamps ever earned
    rewardCount:        { type: Number, default: 0 },        // How many times a free service was redeemed
    lastStampDate:      { type: Date, default: null },       // Date of most recent stamp
    stampExpiryDate:    { type: Date, default: null },       // null = stamps never expire; set by admin config
    pendingReward:      { type: Boolean, default: false },   // true = customer has earned a free service, not yet claimed

    // Stamp audit trail — one entry per stamp added
    stampHistory: [{
        bookingId:  { type: mongoose.Schema.Types.ObjectId, ref: 'booking', default: null },
        date:       { type: Date, default: Date.now },
        addedBy:    { type: String, default: 'System' },    // Employee name or 'System' for auto-stamp
        note:       { type: String, default: '' },
    }],

    // Reward redemption audit trail — one entry per free service claimed
    rewardHistory: [{
        date:          { type: Date, default: Date.now },
        rewardLabel:   { type: String, default: 'Free Armor Treatment' }, // Snapshot of reward name at time of redemption
        rewardValue:   { type: Number, default: 0 },                      // Peso value snapshot (for finance tracking)
        redeemedBy:    { type: String, default: '' },                     // Employee name who processed the reward
        bookingId:     { type: mongoose.Schema.Types.ObjectId, ref: 'booking', default: null },
    }],

}, { timestamps: true });

module.exports = mongoose.model('Membership', membershipSchema);
