const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, enum: ['Chemicals', 'Supplies', 'Tools', 'Equipment', 'Other'], default: 'Chemicals' },
    currentStock: { type: Number, default: 0 },
    unit: { type: String, default: 'ml' }, // ml, L, pcs, kg
    reorderPoint: { type: Number, default: 500 }, // Notify admin when stock is below this
    costPerUnit: { type: Number, default: 0 }, // Cost to buy 1 unit (e.g. ₱0.10/ml)
    lastRestocked: { type: Date, default: Date.now },
    supplier: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Inventory', inventorySchema);
