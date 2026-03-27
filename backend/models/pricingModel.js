const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema({
    vehicleType: { type: String, required: true, unique: true },
    Wash: { type: Number, default: null },
    Armor: { type: Boolean, default: true },
    Wax: { type: Number, default: null },
    Engine: { type: Number, default: null }
}, { timestamps: true });

const Pricing = mongoose.model('Pricing', pricingSchema);

module.exports = Pricing;
