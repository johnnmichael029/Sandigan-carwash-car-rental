const RevenueCategory = require('../models/revenueCategoryModel');

const getCategories = async (req, res) => {
    try {
        const categories = await RevenueCategory.find();
        res.status(200).json(categories);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const createCategory = async (req, res) => {
    try {
        const { name, color, textColor, description } = req.body;
        // Check if exists
        const exists = await RevenueCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (exists) {
            return res.status(400).json({ error: 'Category with this name already exists.' });
        }

        const newCategory = new RevenueCategory({
            name,
            color: color || '#23A0CE',
            textColor: textColor || '#ffffff',
            description
        });
        const savedCategory = await newCategory.save();
        res.status(201).json(savedCategory);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, color, textColor, description } = req.body;

        const category = await RevenueCategory.findById(id);
        if (!category) return res.status(404).json({ error: 'Category not found.' });

        if (name && name.toLowerCase() !== category.name.toLowerCase()) {
            const exists = await RevenueCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
            if (exists) {
                return res.status(400).json({ error: 'Another category with this name already exists.' });
            }
        }

        const updatedCategory = await RevenueCategory.findByIdAndUpdate(
            id,
            { name, color, textColor, description },
            { returnDocument: 'after', runValidators: true }
        );

        res.status(200).json(updatedCategory);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

const deleteCategory = async (req, res) => {
    try {
        const category = await RevenueCategory.findById(req.params.id);
        if (category && category.isSystem) return res.status(400).json({ error: 'System categories cannot be deleted.' });
        await RevenueCategory.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Category deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
