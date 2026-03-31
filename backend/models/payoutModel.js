const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
    detailer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    itemsCount: {
        type: Number,
        default: 0
    },
    period: {
        type: String,
        default: 'custom'
    },
    paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('payout', payoutSchema);
