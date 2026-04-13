const Expense = require('../models/expenseModel');
const { createLog } = require('./activityLogController');

// Get all expenses
const getExpenses = async (req, res) => {
    try {
        const { search, from, to } = req.query;
        const filter = {};

        if (from || to) {
            filter.date = {};
            if (from) filter.date.$gte = new Date(from);
            if (to) {
                const end = new Date(to);
                end.setHours(23, 59, 59, 999);
                filter.date.$lte = end;
            }
        }

        if (search && search.trim()) {
            const query = search.trim();
            filter.$or = [
                { title: { $regex: query, $options: 'i' } },
                { category: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                // Allow searching by Date string (MM/DD/YYYY)
                { $expr: { 
                    $regexMatch: { 
                        input: { $dateToString: { format: "%m/%d/%Y", date: "$date" } }, 
                        regex: query, 
                        options: "i" 
                    } 
                } }
            ];
        }

        const expenses = await Expense.find(filter)
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

        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'FINANCE',
                action: 'expense_created',
                message: `Recorded expense: ${title} (₱${amount.toLocaleString()})`,
                meta: { id: expense._id, category, amount }
            });
        }

        res.status(201).json(expense);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Delete an expense
const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const expense = await Expense.findById(id);
        if (!expense) return res.status(404).json({ error: 'Expense not found' });

        await Expense.findByIdAndDelete(id);

        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'FINANCE',
                action: 'expense_deleted',
                message: `Deleted expense record: ${expense.title} (₱${expense.amount.toLocaleString()})`,
                meta: { id, title: expense.title, amount: expense.amount }
            });
        }

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
