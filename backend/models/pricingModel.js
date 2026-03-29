const mongoose = require('mongoose');

const serviceItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true }
}, { _id: false });

const pricingSchema = new mongoose.Schema({
    vehicleType: { type: String, required: true, unique: true },
    services: { type: [serviceItemSchema], default: [] },
    addons: { type: [serviceItemSchema], default: [] },
    
    // Legacy fields kept for backward compatibility and migration bridging
    Wash: { type: Number, default: null },
    Armor: { type: Boolean, default: null },
    Wax: { type: Number, default: null },
    Engine: { type: Number, default: null }
}, { timestamps: true });

const Pricing = mongoose.model('Pricing', pricingSchema);

module.exports = Pricing;
