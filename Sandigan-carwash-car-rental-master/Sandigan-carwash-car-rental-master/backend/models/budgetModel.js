const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const budgetSchema = new Schema({
    month: {
        type: String,
        required: true,
        // Format: 'YYYY-MM', e.g., '2026-04'
    },
    category: {
        type: String,
        required: true,
        // The exact string name of the expense/bill category. Use 'Overall' for total budget.
    },
    allocatedAmount: {
        type: Number,
        required: true,
        min: 0,
    }
}, { timestamps: true });

// Prevent duplicate budget entries for the same category in the same month
budgetSchema.index({ month: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
