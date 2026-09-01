const mongoose = require('mongoose');

const inventoryCategorySchema = new mongoose.Schema({
    name:        { type: String, required: true, unique: true, trim: true },
    color:       { type: String, required: true, default: '#23A0CE' }, // Hex color for the badge
    textColor:   { type: String, required: true, default: '#ffffff' },
    isSystem:    { type: Boolean, default: false }, // Prevent deletion of default categories
    description: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('InventoryCategory', inventoryCategorySchema);
