const mongoose = require('mongoose');

// Bill Categories (Tag Library for Recurring Bills and potentially other Expenses)
const billCategorySchema = new mongoose.Schema({
    name:        { type: String, required: true, unique: true, trim: true },
    color:       { type: String, required: true, default: '#23A0CE' }, // Hex color for the brand
    textColor:   { type: String, required: true, default: '#ffffff' },
    isSystem:    { type: Boolean, default: false }, 
    description: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('BillCategory', billCategorySchema);
