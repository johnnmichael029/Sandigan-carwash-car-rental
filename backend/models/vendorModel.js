const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['Supplies', 'Utilities', 'Rent', 'Marketing', 'Maintenance', 'Others'], 
        default: 'Supplies' 
    },
    contactPerson: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    paymentTerms: { 
        type: String, 
        enum: ['Cash on Delivery', 'Net 7', 'Net 15', 'Net 30', 'Net 60'], 
        default: 'Cash on Delivery' 
    },
    
    // Financial Tracking
    totalOwed: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
    
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);
