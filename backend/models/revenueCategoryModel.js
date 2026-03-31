const mongoose = require('mongoose');

// Revenue Categories (Tag Library for Finance)
// Used to group Inventory Categories into standardized Income Accounts
const revenueCategorySchema = new mongoose.Schema({
    name:        { type: String, required: true, unique: true, trim: true },
    color:       { type: String, required: true, default: '#23A0CE' }, // Hex color for the brand
    textColor:   { type: String, required: true, default: '#ffffff' },
    isSystem:    { type: Boolean, default: false }, // System-defined (e.g. Services, Membership)
    description: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('RevenueCategory', revenueCategorySchema);
