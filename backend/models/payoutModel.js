const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee',
        required: true
    },
    // Optional field for historical/legacy records
    detailer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee'
    },
    // EARNINGS
    basicPay: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    nightDiffHours: { type: Number, default: 0 },
    nightDiffPay: { type: Number, default: 0 },
    holidayPay: { type: Number, default: 0 },
    bonuses: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 }, // Non-taxable
    grossPay: { type: Number, default: 0 },

    // DEDUCTIONS (EE - Employee Share)
    sssEE: { type: Number, default: 0 },
    philhealthEE: { type: Number, default: 0 },
    hdmfEE: { type: Number, default: 0 },
    withholdingTax: { type: Number, default: 0 },
    latesDeduction: { type: Number, default: 0 },
    absentsDeduction: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },

    // EMPLOYER SHARE (ER)
    sssER: { type: Number, default: 0 },
    philhealthER: { type: Number, default: 0 },
    hdmfER: { type: Number, default: 0 },

    netAmount: { type: Number, required: true }, // Take Home Pay

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
