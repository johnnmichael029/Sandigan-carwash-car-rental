const Promotion = require('../models/promotionModel');
const Customer = require('../models/customerModel');
const { createLog } = require('./activityLogController');

// 1. Create Promotion
const createPromotion = async (req, res) => {
    try {
        const promotion = await Promotion.create(req.body);

        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'PROMOTIONS',
                action: 'promotion_created',
                message: `Created new promotion: ${promotion.name} (${promotion.code})`,
                meta: { id: promotion._id, code: promotion.code }
            });
        }

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
        const { name, code, discountType, discountValue, minSpend, validFrom, validUntil, isActive, useType, maxUsage, usageCount, usedBy } = req.body;
        const promotion = await Promotion.findByIdAndUpdate(req.params.id,
            {
                name,
                code,
                discountType,
                discountValue,
                minSpend,
                validFrom,
                validUntil,
                isActive,
                useType,
                maxUsage,
                usageCount,
                usedBy
            }, { returnDocument: 'after', runValidators: true });
        
        if (!promotion) return res.status(404).json({ error: 'Promotion not found' });

        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'PROMOTIONS',
                action: 'promotion_updated',
                message: `Updated promotion: ${promotion.name}`,
                meta: { id: promotion._id, code: promotion.code }
            });
        }

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
        const promotion = await Promotion.findById(req.params.id);
        if (!promotion) return res.status(404).json({ error: 'Promotion not found' });

        await Promotion.findByIdAndDelete(req.params.id);

        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'PROMOTIONS',
                action: 'promotion_deleted',
                message: `Deleted promotion: ${promotion.name}`,
                meta: { id: promotion._id, code: promotion.code }
            });
        }

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

        const now = new Date();
        if (now < promo.validFrom || now > promo.validUntil) {
            return res.json({ valid: false, message: 'This promo has expired or is not yet active.' });
        }

        const amountToCheck = totalAmount || totalPrice || 0;
        if (amountToCheck < promo.minSpend) {
            return res.json({
                valid: false,
                message: `Minimum spend of ₱${promo.minSpend.toLocaleString()} is required to use this promo.`
            });
        }

        if (promo.useType === 'One-Time' && customerEmail) {
            const customer = await Customer.findOne({ email: customerEmail });
            if (customer && promo.usedBy.includes(customer._id)) {
                return res.status(400).json({ error: 'You have already used this promo code.' });
            }
        }

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
