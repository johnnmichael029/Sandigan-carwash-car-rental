const BillCategory = require('../models/billCategoryModel');
const { createLog } = require('./activityLogController');

// GET all categories
const getCategories = async (req, res) => {
    try {
        const categories = await BillCategory.find().sort({ name: 1 });
        res.status(200).json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE a new category
const createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const exists = await BillCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (exists) {
            return res.status(400).json({ error: 'Another category with this name already exists.' });
        }
        const category = await BillCategory.create(req.body);

        // Activity Log
        await createLog({
            actorId: req.user._id,
            actorName: req.user.fullName,
            actorRole: req.user.role,
            module: 'FINANCE',
            action: 'bill_category_created',
            message: `Created bill category: ${category.name}`,
            meta: { categoryId: category._id }
        });

        res.status(201).json(category);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// UPDATE a category
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, color, textColor, description } = req.body;

        const category = await BillCategory.findById(id);
        if (!category) return res.status(404).json({ error: 'Category not found.' });

        if (name && name.toLowerCase() !== category.name.toLowerCase()) {
            const exists = await BillCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
            if (exists) {
                return res.status(400).json({ error: 'Another category with this name already exists.' });
            }
        }

        const updatedCategory = await BillCategory.findByIdAndUpdate(
            id,
            { name, color, textColor, description },
            { returnDocument: 'after', runValidators: true }
        );

        // Activity Log
        await createLog({
            actorId: req.user._id,
            actorName: req.user.fullName,
            actorRole: req.user.role,
            module: 'FINANCE',
            action: 'bill_category_updated',
            message: `Updated bill category: ${updatedCategory.name}`,
            meta: { categoryId: id }
        });

        res.status(200).json(updatedCategory);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update category' });
    }
};

// DELETE a category
const deleteCategory = async (req, res) => {
    try {
        const category = await BillCategory.findById(req.params.id);
        if (!category) return res.status(404).json({ error: 'Category not found' });
        if (category.isSystem) return res.status(403).json({ error: 'System categories cannot be deleted' });

        await BillCategory.findByIdAndDelete(req.params.id);

        // Activity Log
        await createLog({
            actorId: req.user._id,
            actorName: req.user.fullName,
            actorRole: req.user.role,
            module: 'FINANCE',
            action: 'bill_category_deleted',
            message: `Deleted bill category: ${category.name}`,
            meta: { categoryId: req.params.id }
        });

        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
};
