const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    discountType: { type: String, enum: ['Percentage', 'Flat'], default: 'Percentage' },
    discountValue: { type: Number, required: true },
    validFrom: { type: Date, required: true, default: Date.now },
    validUntil: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    useType: { type: String, enum: ['One-Time', 'Infinite', 'Limited'], default: 'Infinite' },
    minSpend: { type: Number, default: 0 },

    // Usage Tracking
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'customer' }],
    usageCount: { type: Number, default: 0 },
    maxUsage: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Promotion', promotionSchema);
