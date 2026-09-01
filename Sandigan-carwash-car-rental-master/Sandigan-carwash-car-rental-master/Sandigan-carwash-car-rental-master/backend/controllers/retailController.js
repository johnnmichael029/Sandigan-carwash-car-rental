const RetailSale = require('../models/retailSaleModel');
const Product = require('../models/productModel');
const Membership = require('../models/membershipModel');
const Customer = require('../models/customerModel');
const Revenue = require('../models/revenueModel');
const Expense = require('../models/expenseModel');
const { deductStockForProduct } = require('./serviceRecipeController');

// Helper to resolve the SMC Config
const getResolvedSMCConfig = async () => {
    const Setting = require('../models/settingModel');
    const setting = await Setting.findOne({ key: 'smc_config' });
    const val = setting?.value || {};
    return {
        price: val.price || 500,
        validityMonths: val.validityMonths !== undefined ? parseInt(val.validityMonths) : 12,
        abbreviation: val.abbreviation || 'SMC'
    };
};

// Helper to resolve Revenue Category mapping (Inventory -> Revenue Group)
const resolveRevenueCategory = async (prodOrCategory) => {
    try {
        // Handle both product object and category string
        const catName = (typeof prodOrCategory === 'object') ? prodOrCategory.category : prodOrCategory;
        const prodName = (typeof prodOrCategory === 'object') ? prodOrCategory.name : null;

        const Setting = require('../models/settingModel');
        const setting = await Setting.findOne({ key: 'erp_mapping' });
        const mappings = setting?.value?.mappings || [];

        // Check mapping for the category name OR the specific product name
        const match = mappings.find(m => 
            m.inventoryCategory === catName || 
            (prodName && m.inventoryCategory === prodName)
        );

        if (match) return match.revenueGroup;

        // Fallback Mapping based on common sense
        if (prodName?.toUpperCase().includes('SMC')) return 'Membership';
        
        return catName || 'Retail';
    } catch (err) {
        return (typeof prodOrCategory === 'string' ? prodOrCategory : prodOrCategory?.category) || 'Retail';
    }
}

/**
 * Creates a unique transaction ID: MMDDYYYY-H-SequenceTAG
 */
const generateTransactionId = async (productMatch) => {
    const now = new Date();
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const yyyy = now.getFullYear();
    const h = now.getHours();

    const tag = (productMatch.name === 'SMC' || productMatch.name.includes('SMC')) ? 'SMC' :
        productMatch.category?.substring(0, 3).toUpperCase() || 'POS';

    // Start of day to count daily sequence for this tag
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    const count = await RetailSale.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        transactionId: { $regex: new RegExp(`${tag}$`) }
    });

    const sequence = count + 1;
    return `${mm}${dd}${yyyy}-${h}-${sequence}${tag}`;
};

// --- CONTROLLERS ---

// 1. Process Quick Sale (POS)
const createRetailSale = async (req, res) => {
    try {
        const { productId, quantity = 1, paymentMethod = 'Cash', customerId = null } = req.body;

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ error: 'Product not found.' });

        const isSMC = (product.name === 'SMC' || product.name.includes('SMC'));
        const txId = await generateTransactionId(product);
        const totalPrice = product.basePrice * quantity;

        // NEW: Resolve the Revenue Category from dynamic mapping
        const revCategory = await resolveRevenueCategory(product);

        // A. Create the Sale record
        const sale = await RetailSale.create({
            transactionId: txId,
            productId: product._id,
            productName: product.name,
            quantity,
            totalPrice,
            paymentMethod,
            isSMCBuy: isSMC,
            customerId: customerId || null,
            customerType: customerId ? 'Regular' : 'Walk-in'
        });

        // B. Handle SMC Issuance if it's a card purchase
        let smcData = null;
        if (isSMC) {
            const config = await getResolvedSMCConfig();

            // Generate a 6-character alphanumeric ID (Consistent with CRM)
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let newSmcId = `${config.abbreviation || 'SMC'}-`;
            for (let i = 0; i < 6; i++) newSmcId += chars.charAt(Math.floor(Math.random() * chars.length));

            const expiryDate = new Date();
            const months = parseInt(config.validityMonths) || 12;
            expiryDate.setMonth(expiryDate.getMonth() + months);

            const membership = await Membership.create({
                cardId: newSmcId,
                customerId: customerId || null,
                customerName: customerId ? (await Customer.findById(customerId)).firstName : 'Walk-in Customer',
                expiryDate,
                isAssigned: !!customerId
            });

            sale.smcId = newSmcId;
            await sale.save();
            smcData = membership;
        }

        // ── FINANCE ENGINE: Deduct Stock & Record Expense (COGS) ───
        try {
            const { totalCost, category } = await deductStockForProduct(product, quantity);
            if (totalCost > 0) {
                await Expense.create({
                    title: `POS COGS: ${product.name} (x${quantity})`,
                    category: category || 'Retail',
                    amount: totalCost,
                    description: `Automated COGS for sale #${txId}. Target: ${isSMC ? 'SMC Issuance' : 'Over-the-counter'}`
                });
            }
        } catch (err) { console.warn('[Inventory] Stock update failed:', err.message); }

        // ── FINANCE ENGINE: Revenue Recording ───
        try {
            await Revenue.create({
                title: `Retail Sale: ${product.name} (x${quantity})`,
                amount: totalPrice,
                category: revCategory, // Dynamic Revenue Category
                source: 'POS',
                referenceId: txId,
                notes: `Transaction: ${txId} | Type: ${isSMC ? 'Membership Card' : 'General Merchandise'}`,
                recordedBy: req.user?.id || null
            });
        } catch (err) { console.warn('[Revenue] failed to record:', err.message); }

        res.status(201).json({ message: 'Transaction successful.', sale, smcData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Fetch all sales for display
const getAllSales = async (req, res) => {
    try {
        const sales = await RetailSale.find().sort({ createdAt: -1 });
        res.json(sales);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    createRetailSale,
    getAllSales,
    generateTransactionId,
    resolveRevenueCategory
};
