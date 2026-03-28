const ServiceRecipe = require('../models/serviceRecipeModel');
const Inventory = require('../models/inventoryModel');

// GET all recipes (with inventory item details populated)
exports.getRecipes = async (req, res) => {
    try {
        const recipes = await ServiceRecipe.find()
            .populate('ingredients.inventoryItem', 'name unit costPerUnit currentStock')
            .sort({ serviceType: 1, vehicleType: 1 });
        res.status(200).json(recipes);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST — create or replace a recipe for a service+vehicle combo
exports.upsertRecipe = async (req, res) => {
    try {
        const { serviceType, vehicleType, ingredients } = req.body;
        const recipe = await ServiceRecipe.findOneAndUpdate(
            { serviceType, vehicleType: vehicleType || 'All' },
            { serviceType, vehicleType: vehicleType || 'All', ingredients },
            { upsert: true, new: true, runValidators: true }
        ).populate('ingredients.inventoryItem', 'name unit costPerUnit');
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
        const recipe = await ServiceRecipe.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('ingredients.inventoryItem', 'name unit costPerUnit');
        res.status(200).json(recipe);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

/**
 * Called from bookingController when booking is marked 'Completed'.
 * Accepts an array of service types performed + vehicle type.
 * Returns the total supply cost for the booking.
 */
exports.deductStockForBooking = async ({ serviceTypes, vehicleType }) => {
    let totalSupplyCost = 0;

    for (const serviceType of serviceTypes) {
        // Try to find a recipe specific to this vehicle, or fall back to 'All'
        const recipe = await ServiceRecipe.findOne({
            serviceType,
            vehicleType: { $in: [vehicleType, 'All'] }
        }).populate('ingredients.inventoryItem');

        if (!recipe) continue;

        for (const ingredient of recipe.ingredients) {
            const item = ingredient.inventoryItem;
            if (!item) continue;

            const costForThisIngredient = item.costPerUnit * ingredient.quantityUsed;
            totalSupplyCost += costForThisIngredient;

            // Deduct actual stock (don't go below 0)
            const newStock = Math.max(0, item.currentStock - ingredient.quantityUsed);
            await Inventory.findByIdAndUpdate(item._id, { currentStock: newStock });
        }
    }

    return totalSupplyCost;
};
