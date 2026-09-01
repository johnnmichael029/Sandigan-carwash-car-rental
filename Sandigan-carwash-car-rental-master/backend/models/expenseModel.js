const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const expenseSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        // No longer using strict enum to allow for unique inventory tags (e.g., 'SMC', 'Tumbler', etc.)
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String
    },
    receiptUrl: {
        type: String // We can add file upload later
    },
    ingredients: [{
        inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
        quantityUsed: { type: Number }
    }],
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee'
    }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
