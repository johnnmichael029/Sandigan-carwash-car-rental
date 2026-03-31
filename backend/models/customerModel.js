const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, required: true },
    
    // CRM Metrics
    totalVisits: { type: Number, default: 0 },
    lifetimeSpend: { type: Number, default: 0 },
    lastVisitDate: { type: Date, default: null },
    
    // Notes and History
    vehicles: { type: [String], default: [] }, // e.g. ["Toyota Camry", "Ford Everest"]
    notes: { type: String, default: '' },
    
    // Loyalty and Segmentation
    tags: { type: [String], default: ['New Customer'] }, // e.g. "VIP", "Regular", "At-Risk"
    
    // Sandigan Membership Card (SMC)
    hasSMC: { type: Boolean, default: false },
    smcId: { type: String, unique: true, sparse: true },
    smcIssuedDate: { type: Date, default: null },
    smcExpiryDate: { type: Date, default: null }
    
}, { timestamps: true });

module.exports = mongoose.model('customer', customerSchema);
