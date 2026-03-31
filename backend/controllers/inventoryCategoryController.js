const InventoryCategory = require('../models/inventoryCategoryModel');

// ─────────────────────────────────────────────────────────────────────────────
//   INVENTORY CATEGORY CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

// Get all categories
exports.getCategories = async (req, res) => {
    try {
        const categories = await InventoryCategory.find().sort({ createdAt: -1 });
        res.status(200).json(categories);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

// Create a new category
exports.createCategory = async (req, res) => {
    try {
        const { name, color, textColor, description } = req.body;
        // Check if exists
        const exists = await InventoryCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (exists) {
            return res.status(400).json({ error: 'Category with this name already exists.' });
        }

        const newCategory = new InventoryCategory({
            name,
            color: color || '#23A0CE',
            textColor: textColor || '#ffffff',
            description
        });
        const savedCategory = await newCategory.save();
        res.status(201).json(savedCategory);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to create category' });
    }
};

// Update an existing category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, color, textColor, description } = req.body;

        const category = await InventoryCategory.findById(id);
        if (!category) return res.status(404).json({ error: 'Category not found.' });

        if (name && name.toLowerCase() !== category.name.toLowerCase()) {
            const exists = await InventoryCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
            if (exists) {
                return res.status(400).json({ error: 'Another category with this name already exists.' });
            }
        }

        const updatedCategory = await InventoryCategory.findByIdAndUpdate(
            id,
            { name, color, textColor, description },
            { returnDocument: 'after', runValidators: true }
        );

        res.status(200).json(updatedCategory);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update category' });
    }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await InventoryCategory.findById(id);

        if (!category) return res.status(404).json({ error: 'Category not found.' });
        if (category.isSystem) return res.status(400).json({ error: 'System categories cannot be deleted.' });

        await InventoryCategory.findByIdAndDelete(id);
        res.status(200).json({ message: 'Category deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
};
