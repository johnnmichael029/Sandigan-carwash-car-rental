const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    basePrice: { type: Number, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'General' }, // e.g. "Membership", "Merchandise", "Supplies"
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
