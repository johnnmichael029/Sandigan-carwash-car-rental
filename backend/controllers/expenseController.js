const Expense = require('../models/expenseModel');

// Get all expenses
const getExpenses = async (req, res) => {
    try {
        const expenses = await Expense.find()
            .populate('ingredients.inventoryItem', 'name unit')
            .sort({ date: -1 });
        res.status(200).json(expenses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create a new expense
const createExpense = async (req, res) => {
    try {
        const { title, category, amount, date, description } = req.body;
        const recordedBy = req.user ? req.user.id : null;

        const expense = await Expense.create({
            title, category, amount, date, description, recordedBy
        });
        res.status(201).json(expense);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Delete an expense
const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        await Expense.findByIdAndDelete(id);
        res.status(200).json({ message: 'Expense deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getExpenses,
    createExpense,
    deleteExpense
};
