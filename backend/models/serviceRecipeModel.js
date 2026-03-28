const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
    inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
    quantityUsed: { type: Number, required: true }, // in the inventory item's own unit (ml, pcs, etc.)
}, { _id: false });

const serviceRecipeSchema = new mongoose.Schema({
    serviceType: { type: String, required: true }, // e.g. 'Wash', 'Wax', 'Engine'
    vehicleType:  { type: String, default: 'All' }, // 'All', 'Sedan', 'SUV', etc.
    ingredients: [ingredientSchema],
}, { timestamps: true });

// One recipe per service + vehicle combination
serviceRecipeSchema.index({ serviceType: 1, vehicleType: 1 }, { unique: true });

module.exports = mongoose.model('ServiceRecipe', serviceRecipeSchema);
