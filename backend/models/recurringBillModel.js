const mongoose = require('mongoose');

const recurringBillSchema = new mongoose.Schema({
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, enum: ['Utilities', 'Rent', 'Subscriptions', 'Maintenance', 'Other'], default: 'Utilities' },
    frequency: { type: String, enum: ['Monthly', 'Weekly'], default: 'Monthly' },
    lastApplied: { type: Date, default: null }, // null = never applied
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('RecurringBill', recurringBillSchema);
