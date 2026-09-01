const Revenue = require('../models/revenueModel');
const Expense = require('../models/expenseModel');

/**
 * GET /api/ledger
 * Returns a unified General Ledger combining all revenue (CREDIT) and expense (DEBIT)
 * entries sorted chronologically. Also returns a P&L summary and running balance.
 *
 * Query params:
 *   from    — ISO date string (optional)
 *   to      — ISO date string (optional)
 *   type    — 'CREDIT' | 'DEBIT' | '' (optional filter)
 *   search  — string (optional text search against title/category)
 */
const getLedger = async (req, res) => {
    try {
        const { from, to, type, search } = req.query;

        // ── Build date filters ──────────────────────────────────
        const dateFilter = {};
        if (from) dateFilter.$gte = new Date(from);
        if (to) {
            const end = new Date(to);
            end.setHours(23, 59, 59, 999);
            dateFilter.$lte = end;
        }

        const hasDateFilter = Object.keys(dateFilter).length > 0;

        // ── Fetch Revenues (CREDIT entries) ─────────────────────
        const revQuery = hasDateFilter ? { date: dateFilter } : {};
        const revenues = await Revenue.find(revQuery).sort({ date: -1 }).lean();

        // ── Fetch Expenses (DEBIT entries) ──────────────────────
        const expQuery = hasDateFilter ? { date: dateFilter } : {};
        const expenses = await Expense.find(expQuery).sort({ date: -1 }).lean();

        // ── Merge into a unified Ledger ─────────────────────────
        let ledger = [
            ...revenues.map(r => ({
                _id: r._id,
                date: r.date,
                type: 'CREDIT',
                title: r.title,
                category: r.category,
                source: r.source || 'Manual',
                referenceId: r.referenceId || null,
                notes: r.notes || '',
                amount: r.amount,
            })),
            ...expenses.map(e => ({
                _id: e._id,
                date: e.date,
                type: 'DEBIT',
                title: e.title,
                category: e.category,
                source: 'Expense',
                referenceId: null,
                notes: e.description || '',
                amount: e.amount,
            })),
        ];

        // ── Apply type filter ──────────────────────────────────
        if (type === 'CREDIT' || type === 'DEBIT') {
            ledger = ledger.filter(e => e.type === type);
        }

        // ── Apply text search ──────────────────────────────────
        if (search && search.trim()) {
            const term = search.trim().toLowerCase();
            ledger = ledger.filter(e =>
                (e.title && e.title.toLowerCase().includes(term)) ||
                (e.category && e.category.toLowerCase().includes(term)) ||
                (e.source && e.source.toLowerCase().includes(term)) ||
                (e.referenceId && e.referenceId.toLowerCase().includes(term))
            );
        }

        // ── Sort chronologically (newest first) ─────────────────
        ledger.sort((a, b) => new Date(b.date) - new Date(a.date));

        // ── Compute P&L Summary ────────────────────────────────
        // (Always on full unfiltered data for accuracy)
        const totalRevAllQuery = hasDateFilter ? { date: dateFilter } : {};
        const totalExpAllQuery = hasDateFilter ? { date: dateFilter } : {};

        const allRevenues = await Revenue.find(totalRevAllQuery).lean();
        const allExpenses = await Expense.find(totalExpAllQuery).lean();

        const totalInflow  = allRevenues.reduce((s, r) => s + (r.amount || 0), 0);
        const totalOutflow = allExpenses.reduce((s, e) => s + (e.amount || 0), 0);
        const netIncome    = totalInflow - totalOutflow;

        // ── Expense Breakdown by Category (for Distribution chart) ──
        const expenseCategoryMap = {};
        allExpenses.forEach(e => {
            const cat = e.category || 'Uncategorized';
            expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + e.amount;
        });
        const expenseBreakdown = Object.entries(expenseCategoryMap)
            .map(([category, amount]) => ({ category, amount, pct: totalOutflow > 0 ? ((amount / totalOutflow) * 100).toFixed(1) : 0 }))
            .sort((a, b) => b.amount - a.amount);

        // ── Revenue Breakdown by Category ──────────────────────
        const revenueCategoryMap = {};
        allRevenues.forEach(r => {
            const cat = r.category || 'Uncategorized';
            revenueCategoryMap[cat] = (revenueCategoryMap[cat] || 0) + r.amount;
        });
        const revenueBreakdown = Object.entries(revenueCategoryMap)
            .map(([category, amount]) => ({ category, amount, pct: totalInflow > 0 ? ((amount / totalInflow) * 100).toFixed(1) : 0 }))
            .sort((a, b) => b.amount - a.amount);

        res.status(200).json({
            ledger,
            summary: {
                totalInflow,
                totalOutflow,
                netIncome,
                entryCount: ledger.length,
            },
            expenseBreakdown,
            revenueBreakdown,
        });

    } catch (err) {
        console.error('[Ledger] Error generating ledger:', err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getLedger };
