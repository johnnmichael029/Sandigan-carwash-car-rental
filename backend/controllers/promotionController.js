const Promotion = require('../models/promotionModel');
const Customer = require('../models/customerModel');

// 1. Create Promotion
const createPromotion = async (req, res) => {
    try {
        const promotion = new Promotion(req.body);
        await promotion.save();
        res.status(201).json(promotion);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: "A promotion with this code already exists. Please choose a different code." });
        }
        res.status(400).json({ error: err.message });
    }
};

// 2. Get All Promotions
const getAllPromotions = async (req, res) => {
    try {
        const promotions = await Promotion.find().sort({ createdAt: -1 });
        res.json(promotions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Update Promotion
const updatePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(promotion);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: "A promotion with this code already exists." });
        }
        res.status(400).json({ error: err.message });
    }
};

// 4. Delete Promotion
const deletePromotion = async (req, res) => {
    try {
        await Promotion.findByIdAndDelete(req.params.id);
        res.json({ message: 'Promotion deleted' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// 5. Validate Promotion Code (For POS usage)
const validatePromoCode = async (req, res) => {
    try {
        const { code, customerEmail, totalAmount, totalPrice } = req.body;
        const normalizedCode = code.toUpperCase().trim();

        const promo = await Promotion.findOne({ code: normalizedCode, isActive: true });

        if (!promo) return res.json({ valid: false, message: 'Promo code not found or inactive.' });

        // Check Validity Period
        const now = new Date();
        if (now < promo.validFrom || now > promo.validUntil) {
            return res.json({ valid: false, message: 'This promo has expired or is not yet active.' });
        }

        // Check Min Spend
        const amountToCheck = totalAmount || totalPrice || 0;
        if (amountToCheck < promo.minSpend) {
            return res.json({
                valid: false,
                message: `Minimum spend of ₱${promo.minSpend.toLocaleString()} is required to use this promo.`
            });
        }

        // Check One-Time Use per Customer
        if (promo.useType === 'One-Time' && customerEmail) {
            const customer = await Customer.findOne({ email: customerEmail });
            if (customer && promo.usedBy.includes(customer._id)) {
                return res.status(400).json({ error: 'You have already used this promo code.' });
            }
        }

        // Check Limited Use
        if (promo.useType === 'Limited' && promo.usageCount >= promo.maxUsage) {
            return res.json({ valid: false, message: 'This promo has reached its maximum usage limit.' });
        }

        res.json({
            valid: true,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            code: promo.code
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    createPromotion,
    getAllPromotions,
    updatePromotion,
    deletePromotion,
    validatePromoCode
};
