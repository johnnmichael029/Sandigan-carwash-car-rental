const mongoose = require('mongoose');

const retailSaleSchema = new mongoose.Schema({
    transactionId: { type: String, required: true, unique: true }, // MMDDYYYY-H-SequenceTAG
    productName: { type: String, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true, default: 1 },
    totalPrice: { type: Number, required: true },
    paymentMethod: { type: String, default: 'Cash' },
    isSMCBuy: { type: Boolean, default: false }, // Flag for cards
    smcId: { type: String, default: null }, // Link to card if it's an SMC sale
    customerType: { type: String, enum: ['Walk-in', 'Regular'], default: 'Walk-in' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null } // Optional
}, { timestamps: true });

module.exports = mongoose.model('RetailSale', retailSaleSchema);
