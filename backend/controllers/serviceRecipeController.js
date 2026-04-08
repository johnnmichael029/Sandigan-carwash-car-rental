const ServiceRecipe = require('../models/serviceRecipeModel');
const Inventory = require('../models/inventoryModel');
const Asset = require('../models/assetModel');
const { logMovement } = require('./stockMovementController');

// GET all recipes (with inventory item details populated)
exports.getRecipes = async (req, res) => {
    try {
        const recipes = await ServiceRecipe.find()
            .populate('ingredients.inventoryItem', 'name unit costPerUnit currentStock')
            .populate('equipmentUsed', 'name category')
            .sort({ category: 1, serviceType: 1, vehicleType: 1 });
        res.status(200).json(recipes);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST — create or replace a recipe for a service+vehicle combo (or product)
exports.upsertRecipe = async (req, res) => {
    try {
        const { serviceType, vehicleType, ingredients, category } = req.body;
        const recipeCategory = category || 'Service';
        const recipeVehicleType = recipeCategory === 'Product' ? 'N/A' : (vehicleType || 'All');

        const recipe = await ServiceRecipe.findOneAndUpdate(
            { category: recipeCategory, serviceType, vehicleType: recipeVehicleType },
            { category: recipeCategory, serviceType, vehicleType: recipeVehicleType, ingredients, equipmentUsed: req.body.equipmentUsed || [] },
            { upsert: true, returnDocument: 'after', runValidators: true }
        ).populate('ingredients.inventoryItem', 'name unit costPerUnit').populate('equipmentUsed', 'name category');
        res.status(200).json(recipe);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// DELETE a recipe
exports.deleteRecipe = async (req, res) => {
    try {
        await ServiceRecipe.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Recipe deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// PATCH — update a recipe by ID
exports.updateRecipe = async (req, res) => {
    try {
        const recipe = await ServiceRecipe.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true })
            .populate('ingredients.inventoryItem', 'name unit costPerUnit').populate('equipmentUsed', 'name category');
        res.status(200).json(recipe);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

/**
 * INTERNAL HELPER: Deduct inventory for a car wash BOOKING.
 * Called from bookingController when booking is marked 'Completed'.
 */
exports.deductStockForBooking = async ({ serviceTypes, vehicleType }) => {
    let totalSupplyCost = 0;
    const processedAssets = new Set();

    for (const serviceType of serviceTypes) {
        let recipe = await ServiceRecipe.findOne({
            category: 'Service',
            serviceType,
            vehicleType
        }).populate('ingredients.inventoryItem');

        // Fallback to 'All' vehicle-type recipe if no specific one found
        if (!recipe && vehicleType !== 'All') {
            recipe = await ServiceRecipe.findOne({
                category: 'Service',
                serviceType,
                vehicleType: 'All'
            }).populate('ingredients.inventoryItem');
        }

        if (!recipe) continue;

        // Increment equipment usage (Only once per asset per booking)
        if (recipe.equipmentUsed && recipe.equipmentUsed.length > 0) {
            for (const assetId of recipe.equipmentUsed) {
                const idStr = assetId.toString();
                if (!processedAssets.has(idStr)) {
                    await Asset.findByIdAndUpdate(assetId, { $inc: { usageCounter: 1 } });
                    processedAssets.add(idStr);
                }
            }
        }

        for (const ingredient of recipe.ingredients) {
            const item = ingredient.inventoryItem;
            if (!item) continue;

            const costForThisIngredient = item.costPerUnit * ingredient.quantityUsed;
            totalSupplyCost += costForThisIngredient;

            const oldStock = item.currentStock;
            const newStock = Math.max(0, item.currentStock - ingredient.quantityUsed);
            await Inventory.findByIdAndUpdate(item._id, { currentStock: newStock });

            await logMovement({
                inventoryItem: item._id,
                type: 'Outbound',
                quantity: -ingredient.quantityUsed,
                previousStock: oldStock,
                newStock: newStock,
                reason: `Service: ${serviceType}`
            });
        }
    }

    return totalSupplyCost;
};

/**
 * INTERNAL HELPER: Deduct inventory for a PRODUCT sale (e.g., SMC Card).
 * Called from crmController when an SMC is issued.
 * @param {string} productName — must match the serviceType field in the recipe (e.g., 'SMC Card')
 * @returns {number} total cost of items deducted
 */
exports.deductStockForProduct = async (productData, quantityMultiplier = 1) => {
    let totalCost = 0;
    try {
        // Resolve name and category flexibly
        const prodName = typeof productData === 'string' ? productData : (productData?.productName || productData?.name);
        const prodCategory = typeof productData === 'object' ? productData?.category : null;

        // Strategy 1: Match by Category (Primary)
        let recipe = null;
        if (prodCategory && prodCategory !== 'General') {
            recipe = await ServiceRecipe.findOne({
                category: 'Product',
                serviceType: prodCategory,
                vehicleType: 'N/A'
            }).populate('ingredients.inventoryItem');
        }

        // Strategy 2: Match by exact Name (Fallback)
        if (!recipe) {
            recipe = await ServiceRecipe.findOne({
                category: 'Product',
                serviceType: prodName,
                vehicleType: 'N/A'
            }).populate('ingredients.inventoryItem');
        }

        if (!recipe) {
            console.log(`[Recipe] Warning: No product recipe found for "${prodName}" (Category: ${prodCategory}) — skipping deduction.`);
            return 0;
        }

        for (const ingredient of recipe.ingredients) {
            const item = ingredient.inventoryItem;
            if (!item) continue;

            const unitCost = Number(item.costPerUnit) || 0;
            const qtyUsed = Number(ingredient.quantityUsed) || 0;
            const deductQty = qtyUsed * quantityMultiplier;
            const costForIngredient = unitCost * deductQty;
            totalCost += Number(costForIngredient) || 0;

            const oldStock = Number(item.currentStock) || 0;
            const newStock = Math.max(0, oldStock - deductQty);
            await Inventory.findByIdAndUpdate(item._id, { currentStock: newStock });

            await logMovement({
                inventoryItem: item._id,
                type: 'Outbound',
                quantity: -deductQty,
                previousStock: oldStock,
                newStock: newStock,
                reason: `Product Sale: ${prodName}`
            });

            console.log(`[Recipe] Item: ${item.name} | Deducted: ${deductQty} | Remaining: ${newStock} | Cost: ₱${costForIngredient}`);
        }

        const finalTotal = Number(totalCost) || 0;
        const mainCategory = recipe.ingredients[0]?.inventoryItem?.category || 'Retail';
        console.log(`Final COGS for "${prodName}": ₱${finalTotal} (Category: ${mainCategory})`);
        return { totalCost: finalTotal, category: mainCategory };
    } catch (err) {
        console.error(`Error deducting product stock for "${productName}":`, err.message);
        return 0;
    }
};

exports.getIngredientsForBooking = async ({ serviceTypes, vehicleType }) => {
    const allIngredients = [];
    for (const serviceType of serviceTypes) {
        const recipe = await ServiceRecipe.findOne({
            category: 'Service',
            serviceType,
            vehicleType: { $in: [vehicleType, 'All'] }
        });
        if (recipe) {
            recipe.ingredients.forEach(ing => {
                allIngredients.push({
                    inventoryItem: ing.inventoryItem,
                    quantityUsed: ing.quantityUsed
                });
            });
        }
    }
    return allIngredients;
};