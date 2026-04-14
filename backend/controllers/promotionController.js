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
                message: `Created new promotion: ${promotion.code}`,
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
        const { code, description, discountType, discountValue, minSpend, validFrom, validUntil, isActive, useType, maxUsage, usageCount, usedBy } = req.body;
        const promotion = await Promotion.findByIdAndUpdate(req.params.id,
            {
                code,
                description,
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
                message: `Updated promotion: ${promotion.code}`,
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
                message: `Deleted promotion: ${promotion.code}`,
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

        // Check usage based on type
        if ((promo.useType === 'One-Time' || promo.useType === 'Limited') && customerEmail) {
            const customer = await Customer.findOne({ email: customerEmail });
            if (customer && promo.usedBy.some(id => id.toString() === customer._id.toString())) {
                return res.json({ valid: false, message: 'You have already used this promo code.' });
            }
        }

        if (promo.useType === 'Limited' && promo.usageCount >= promo.maxUsage) {
            return res.json({ valid: false, message: 'This promo has reached its maximum global usage limit.' });
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

// 6. Claim Promotion
const claimPromotion = async (req, res) => {
    try {
        const { promoId } = req.body;
        const customerId = req.customer._id;

        const promo = await Promotion.findById(promoId);
        if (!promo) return res.status(404).json({ error: 'Promotion not found' });
        if (!promo.isActive) return res.status(400).json({ error: 'This promotion is no longer active.' });

        // Check global capacity for Limited type
        if (promo.useType === 'Limited' && promo.usageCount >= promo.maxUsage) {
            return res.status(400).json({ error: 'This limited edition voucher is already fully claimed.' });
        }

        const customer = req.customer; // already fetched by middleware
        
        // Re-fetch with claimedVouchers populated for check
        const fullCustomer = await Customer.findById(customerId);
        if (fullCustomer.claimedVouchers.some(id => id.toString() === promoId.toString())) {
            return res.status(400).json({ error: 'You have already claimed this voucher.' });
        }

        if ((promo.useType === 'One-Time' || promo.useType === 'Limited') && promo.usedBy.some(id => id.toString() === customerId.toString())) {
            return res.status(400).json({ error: 'You have already used this voucher.' });
        }

        fullCustomer.claimedVouchers.push(promoId);
        await fullCustomer.save();

        res.json({ message: 'Voucher claimed successfully!', voucher: promo });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 7. Get My Claimed Vouchers
const getMyVouchers = async (req, res) => {
    try {
        const customerId = req.customer._id;
        const customer = await Customer.findById(customerId).populate('claimedVouchers');
        
        const vouchers = (customer.claimedVouchers || []).filter(v => {
            if (!v.isActive) return false;
            return true;
        }).map(v => {
            // A voucher is considered 'Used' if it's One-Time/Limited and user is in usedBy
            const isUsed = (v.useType === 'One-Time' || v.useType === 'Limited') && v.usedBy.some(id => id.toString() === customerId.toString());
            const isExpired = new Date() > v.validUntil;
            const isExhausted = v.useType === 'Limited' && v.usageCount >= v.maxUsage && !isUsed;
            
            return { ...v.toObject(), isUsed, isExpired, isExhausted };
        });

        res.json(vouchers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    createPromotion,
    getAllPromotions,
    updatePromotion,
    deletePromotion,
    validatePromoCode,
    claimPromotion,
    getMyVouchers
};
