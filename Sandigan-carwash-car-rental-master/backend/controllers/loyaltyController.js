const Membership = require('../models/membershipModel');
const Expense = require('../models/expenseModel');
const Setting = require('../models/settingModel');
const { createLog } = require('./activityLogController');

// ── Internal helper: get loyalty config from settings ─────────────────────────
const getLoyaltyConfig = async () => {
    const settings = await Setting.find({
        key: { $in: ['loyalty_stamps_required', 'loyalty_reward_name', 'loyalty_reward_value', 'loyalty_expiry_enabled', 'loyalty_expiry_days', 'loyalty_active'] }
    });
    const get = (key, def) => {
        const s = settings.find(s => s.key === key);
        return s ? s.value : def;
    };
    return {
        stampsRequired: get('loyalty_stamps_required', 9),
        rewardName: get('loyalty_reward_name', 'Free Armor Treatment'),
        rewardValue: get('loyalty_reward_value', 150),
        expiryEnabled: get('loyalty_expiry_enabled', false),
        expiryDays: get('loyalty_expiry_days', 365),
        isActive: get('loyalty_active', true),
    };
};

// ── Internal helper: shared stamp add logic (used by controller + booking auto-stamp) ──
const addStampToCard = async (cardId, { bookingId = null, addedBy = 'System', note = '' } = {}) => {
    const config = await getLoyaltyConfig();

    let card = await Membership.findOne({ cardId: cardId.trim().toUpperCase() });
    if (!card) throw new Error(`Loyalty card not found: ${cardId}`);
    if (card.status !== 'Active') throw new Error(`Card ${cardId} is not active.`);

    // Handle stamp expiry: if configured and last stamp is too old, reset progress
    if (config.expiryEnabled && card.lastStampDate) {
        const daysSinceLast = (Date.now() - new Date(card.lastStampDate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLast > config.expiryDays) {
            card.stampCount = 0;
            card.stampExpiryDate = null;
        }
    }

    // Add stamp
    card.stampCount += 1;
    card.totalStampsEarned += 1;
    card.lastStampDate = new Date();
    card.stampHistory.push({ bookingId, date: new Date(), addedBy, note });

    // Compute expiry date for current batch
    if (config.expiryEnabled) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + config.expiryDays);
        card.stampExpiryDate = expiry;
    } else {
        card.stampExpiryDate = null;
    }

    let rewardTriggered = false;

    // Check if reward threshold reached
    if (card.stampCount >= config.stampsRequired) {
        card.stampCount = 0;   // reset for next card
        card.rewardCount += 1;
        card.pendingReward = true;
        rewardTriggered = true;
    }

    await card.save();
    return { card, rewardTriggered, config };
};

// ── POST /api/loyalty/add-stamp ───────────────────────────────────────────────
// Staff manually adds a stamp (or can be called from booking controller)
const addStamp = async (req, res) => {
    try {
        const { cardId, bookingId, note } = req.body;
        if (!cardId) return res.status(400).json({ error: 'cardId is required.' });

        const addedBy = req.user?.fullName || 'Staff';
        const { card, rewardTriggered, config } = await addStampToCard(cardId, { bookingId, addedBy, note });

        await createLog({
            actorId: req.user._id,
            actorName: req.user.fullName,
            actorRole: req.user.role,
            module: 'LOYALTY',
            action: 'stamp_added',
            message: `Stamp added to card ${cardId} by ${addedBy}. Stamps: ${card.totalStampsEarned} total.${rewardTriggered ? ' 🎉 Reward triggered!' : ''}`,
            meta: { cardId, bookingId, rewardTriggered }
        });

        res.status(200).json({
            success: true,
            card,
            rewardTriggered,
            config,
            message: rewardTriggered
                ? `🎉 Reward earned! Customer gets 1 ${config.rewardName}!`
                : `Stamp added. ${config.stampsRequired - card.stampCount} more to earn a ${config.rewardName}.`
        });
    } catch (err) {
        console.error('addStamp error:', err);
        res.status(400).json({ error: err.message });
    }
};

// ── POST /api/loyalty/remove-stamp ───────────────────────────────────────────
// Staff corrects an accidental stamp (removes last stamp entry)
const removeStamp = async (req, res) => {
    try {
        const { cardId, reason } = req.body;
        if (!cardId) return res.status(400).json({ error: 'cardId is required.' });

        const card = await Membership.findOne({ cardId: cardId.trim().toUpperCase() });
        if (!card) return res.status(404).json({ error: 'Card not found.' });
        if (card.stampCount === 0) return res.status(400).json({ error: 'No stamps to remove.' });

        card.stampCount = Math.max(0, card.stampCount - 1);
        card.totalStampsEarned = Math.max(0, card.totalStampsEarned - 1);
        // Remove last stamp history entry
        if (card.stampHistory.length > 0) card.stampHistory.pop();

        await card.save();

        await createLog({
            actorId: req.user._id,
            actorName: req.user.fullName,
            actorRole: req.user.role,
            module: 'LOYALTY',
            action: 'stamp_removed',
            message: `Stamp removed from card ${cardId} by ${req.user.fullName}. Reason: ${reason || 'Not specified'}`,
            meta: { cardId, reason }
        });

        res.status(200).json({ success: true, card, message: 'Stamp removed successfully.' });
    } catch (err) {
        console.error('removeStamp error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ── POST /api/loyalty/redeem-reward ──────────────────────────────────────────
// Staff marks the free service as redeemed and auto-creates a Loyalty expense
const redeemReward = async (req, res) => {
    try {
        const { cardId, bookingId } = req.body;
        if (!cardId) return res.status(400).json({ error: 'cardId is required.' });

        const card = await Membership.findOne({ cardId: cardId.trim().toUpperCase() });
        if (!card) return res.status(404).json({ error: 'Card not found.' });
        if (!card.pendingReward) return res.status(400).json({ error: 'This card has no pending reward to redeem.' });

        const config = await getLoyaltyConfig();
        const redeemedBy = req.user?.fullName || 'Staff';

        // ── Calculate supply cost and check deduction status first ─────────
        let calculatedSupplyCost = 0;
        let alreadyDeducted = false;
        let vehicleType = 'All';
        let serviceToDeduct = config.rewardName;

        try {
            const ServiceRecipe = require('../models/serviceRecipeModel');
            const recipes = await ServiceRecipe.find({ category: 'Service' });
            
            const cleanReward = config.rewardName.trim().toLowerCase().replace(/^free\s+/i, '');
            const match = recipes.find(r => {
                const cleanType = r.serviceType.trim().toLowerCase();
                return cleanReward.includes(cleanType) || cleanType.includes(cleanReward);
            });
            if (match) {
                serviceToDeduct = match.serviceType;
                
                // Calculate supply cost dynamically
                const populatedRecipe = await ServiceRecipe.findById(match._id).populate('ingredients.inventoryItem');
                if (populatedRecipe && populatedRecipe.ingredients) {
                    for (const ing of populatedRecipe.ingredients) {
                        if (ing.inventoryItem) {
                            calculatedSupplyCost += ing.inventoryItem.costPerUnit * ing.quantityUsed;
                        }
                    }
                }
            }

            if (bookingId) {
                const Booking = require('../models/bookingModel');
                const bookingDoc = await Booking.findById(bookingId);
                if (bookingDoc) {
                    vehicleType = bookingDoc.vehicleType || 'All';
                    // Check if the matched service type is in the booking's service list
                    const hasService = bookingDoc.serviceType.some(s => {
                        const cleanS = s.trim().toLowerCase();
                        const cleanT = serviceToDeduct.trim().toLowerCase();
                        return cleanS.includes(cleanT) || cleanT.includes(cleanS);
                    });
                    if (hasService && bookingDoc.status === 'Completed') {
                        alreadyDeducted = true;
                    }
                }
            }
        } catch (prepErr) {
            console.warn('Loyalty reward inventory calculation prep failed:', prepErr.message);
        }

        // Record redemption in reward history (with value snapshot for finance)
        card.rewardHistory.push({
            date: new Date(),
            rewardLabel: config.rewardName,
            rewardValue: config.rewardValue,
            redeemedBy,
            bookingId: bookingId || null,
        });
        card.pendingReward = false;
        await card.save();

        // ── Auto-create a Loyalty expense entry in Finance (Net of Supply Cost) ──
        try {
            const loyaltyExpenseAmount = Math.max(0, config.rewardValue - calculatedSupplyCost);
            await Expense.create({
                title: `Loyalty Reward — ${card.cardId} (${card.customerName})`,
                category: 'Loyalty',
                amount: loyaltyExpenseAmount,
                date: new Date(),
                description: `${config.rewardName.toLowerCase().startsWith('free') ? '' : 'Free '}${config.rewardName} redeemed by ${card.customerName}. Processed by ${redeemedBy}. (Net of supply cost ₱${calculatedSupplyCost.toFixed(2)})`,
                recordedBy: req.user._id,
            });
        } catch (expErr) {
            // Non-blocking: log but don't fail the redemption
            console.warn('Loyalty expense auto-create failed:', expErr.message);
        }

        // ── Auto-deduct inventory stock & create Supplies expense (if not already done by booking) ──
        if (!alreadyDeducted) {
            try {
                const { deductStockForBooking, getIngredientsForBooking } = require('./serviceRecipeController');
                const supplyCost = await deductStockForBooking({
                    serviceTypes: [serviceToDeduct],
                    vehicleType
                });

                if (supplyCost > 0) {
                    const Expense = require('../models/expenseModel');
                    const ingredientsUsed = await getIngredientsForBooking({
                        serviceTypes: [serviceToDeduct],
                        vehicleType
                    });

                    await Expense.create({
                        title: `Supplies used — Loyalty Reward (${card.cardId})`,
                        category: 'Supplies',
                        amount: supplyCost,
                        description: `Auto-deducted per service recipe for ${config.rewardName} (${vehicleType})`,
                        ingredients: ingredientsUsed
                    });
                }
            } catch (deductErr) {
                console.warn('Loyalty reward inventory auto-deduction failed:', deductErr.message);
            }
        }

        await createLog({
            actorId: req.user._id,
            actorName: req.user.fullName,
            actorRole: req.user.role,
            module: 'LOYALTY',
            action: 'reward_redeemed',
            message: `${config.rewardName} redeemed for card ${cardId} by ${redeemedBy}. Value: ₱${config.rewardValue}`,
            meta: { cardId, bookingId, rewardLabel: config.rewardName, rewardValue: config.rewardValue }
        });

        res.status(200).json({
            success: true,
            card,
            config,
            message: `✅ Reward redeemed! 1 ${config.rewardName} for ${card.customerName}.`
        });
    } catch (err) {
        console.error('redeemReward error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ── GET /api/loyalty/card/:cardId ─────────────────────────────────────────────
// Get full loyalty status for a card (used by booking modal + CRM)
const getCard = async (req, res) => {
    try {
        const card = await Membership.findOne({ cardId: req.params.cardId.trim().toUpperCase() });
        if (!card) return res.status(404).json({ error: 'Card not found.' });

        const config = await getLoyaltyConfig();

        // Compute total reward value from history
        const totalRewardValue = card.rewardHistory.reduce((sum, r) => sum + (r.rewardValue || 0), 0);

        res.status(200).json({
            card,
            config,
            totalRewardValue,
            stampsToNextReward: Math.max(0, config.stampsRequired - card.stampCount),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── GET /api/loyalty/config ───────────────────────────────────────────────────
// Returns current loyalty config (public-ish — any auth'd user)
const getConfig = async (req, res) => {
    try {
        const config = await getLoyaltyConfig();
        res.status(200).json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── PUT /api/loyalty/config ───────────────────────────────────────────────────
// Admin updates loyalty settings
const updateConfig = async (req, res) => {
    try {
        const { stampsRequired, rewardName, rewardValue, expiryEnabled, expiryDays, isActive } = req.body;

        const upsert = async (key, value) => {
            await Setting.findOneAndUpdate({ key }, { value }, { upsert: true, runValidators: false });
        };

        if (stampsRequired !== undefined) await upsert('loyalty_stamps_required', Number(stampsRequired));
        if (rewardName !== undefined) await upsert('loyalty_reward_name', rewardName);
        if (rewardValue !== undefined) await upsert('loyalty_reward_value', Number(rewardValue));
        if (expiryEnabled !== undefined) await upsert('loyalty_expiry_enabled', Boolean(expiryEnabled));
        if (expiryDays !== undefined) await upsert('loyalty_expiry_days', Number(expiryDays));
        if (isActive !== undefined) await upsert('loyalty_active', Boolean(isActive));

        await createLog({
            actorId: req.user._id,
            actorName: req.user.fullName,
            actorRole: req.user.role,
            module: 'LOYALTY',
            action: 'config_updated',
            message: `Loyalty config updated by ${req.user.fullName}`,
            meta: req.body
        });

        const updatedConfig = await getLoyaltyConfig();
        res.status(200).json({ success: true, config: updatedConfig });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    addStamp,
    removeStamp,
    redeemReward,
    getCard,
    getConfig,
    updateConfig,
    addStampToCard,   // exported so bookingController can call it for auto-stamp
};
