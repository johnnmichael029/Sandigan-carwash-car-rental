const Budget = require('../models/budgetModel');
const Expense = require('../models/expenseModel');
const { createLog } = require('./activityLogController');

// ── GET Budgets vs Actuals for a specific month ──
const getBudgets = async (req, res) => {
    try {
        const { month } = req.query; // format: 'YYYY-MM'
        if (!month) {
            return res.status(400).json({ error: 'Month parameter (YYYY-MM) is required.' });
        }

        // Parse start and end dates for the given month
        const [year, m] = month.split('-');
        const startDate = new Date(year, parseInt(m) - 1, 1);
        const endDate = new Date(year, parseInt(m), 0, 23, 59, 59, 999);

        // Fetch all budget allocations for the month
        const budgets = await Budget.find({ month });

        // Aggregate actual expenses for the month grouped by category
        const expensesAgg = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: '$category',
                    spentAmount: { $sum: '$amount' }
                }
            }
        ]);

        // Create a map of category -> spentAmount
        const spentMap = {};
        let totalSpentForAllCategories = 0;

        expensesAgg.forEach(exp => {
            spentMap[exp._id] = exp.spentAmount;
            totalSpentForAllCategories += exp.spentAmount;
        });

        // Map the spent amounts back into the budget records
        const budgetsWithActuals = budgets.map(budget => {
            let spent = 0;
            if (budget.category === 'Overall') {
                spent = totalSpentForAllCategories; // Total of ALL expenses in that month
            } else {
                spent = spentMap[budget.category] || 0; // Specific category expense
            }

            return {
                ...budget.toObject(),
                spentAmount: spent,
                utilizationPercentage: budget.allocatedAmount > 0
                    ? ((spent / budget.allocatedAmount) * 100).toFixed(2)
                    : 0
            };
        });

        res.status(200).json(budgetsWithActuals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── SET (Upsert) a Budget Allocation ──
const setBudget = async (req, res) => {
    try {
        const { month, category, allocatedAmount } = req.body;

        if (!month || !category || allocatedAmount == null) {
            return res.status(400).json({ error: 'Month, category, and allocatedAmount are required.' });
        }

        // Upsert the budget
        const budget = await Budget.findOneAndUpdate(
            { month, category },
            { month, category, allocatedAmount },
            { returnDocument: 'after', upsert: true, runValidators: true }
        );

        // Activity Log
        await createLog({
            actorId: req.user._id,
            actorName: req.user.fullName,
            actorRole: req.user.role,
            module: 'FINANCE',
            action: 'setting_updated', // We can reuse setting_updated or use bill_updated
            message: `Set budget for ${category} in ${month} to ₱${allocatedAmount}`,
            meta: { budgetId: budget._id, month, category }
        });

        res.status(200).json(budget);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── DELETE a Budget Allocation ──
const deleteBudget = async (req, res) => {
    try {
        const { id } = req.params;
        const budget = await Budget.findById(id);

        if (!budget) {
            return res.status(404).json({ error: 'Budget not found.' });
        }

        await Budget.findByIdAndDelete(id);

        // Activity Log
        await createLog({
            actorId: req.user._id,
            actorName: req.user.fullName,
            actorRole: req.user.role,
            module: 'FINANCE',
            action: 'setting_updated',
            message: `Deleted budget for ${budget.category} in ${budget.month}`,
            meta: { budgetId: id }
        });

        res.status(200).json({ message: 'Budget deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getBudgets,
    setBudget,
    deleteBudget
};
