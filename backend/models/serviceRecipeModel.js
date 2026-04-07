const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
    inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
    quantityUsed: { type: Number, required: true }, // in the inventory item's own unit (ml, pcs, etc.)
}, { _id: false });

const serviceRecipeSchema = new mongoose.Schema({
    // 'Service' = car wash/add-on | 'Product' = SMC card, physical goods, etc.
    category: {
        type: String,
        enum: ['Service', 'Product'],
        default: 'Service'
    },
    serviceType: { type: String, required: true }, // e.g. 'Wash', 'Wax', 'SMC Card'
    vehicleType:  { type: String, default: 'All' }, // 'All', 'Sedan', 'SUV', 'N/A' (products use 'N/A')
    ingredients: [ingredientSchema],
    equipmentUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'asset' }] // Optional fixed assets used
}, { timestamps: true });

// Unique per category + service + vehicle combo
serviceRecipeSchema.index({ category: 1, serviceType: 1, vehicleType: 1 }, { unique: true });

module.exports = mongoose.model('ServiceRecipe', serviceRecipeSchema);
