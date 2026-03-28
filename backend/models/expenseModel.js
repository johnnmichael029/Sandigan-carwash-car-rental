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
        enum: ['Supplies', 'Utilities', 'Rent', 'Marketing', 'Maintenance', 'Salaries', 'Other']
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
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee'
    }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
