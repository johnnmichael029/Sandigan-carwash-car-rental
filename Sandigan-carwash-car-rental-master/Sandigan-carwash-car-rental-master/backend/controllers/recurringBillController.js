const RecurringBill = require('../models/recurringBillModel');
const Expense = require('../models/expenseModel');
const { createLog } = require('./activityLogController');

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Returns true if the bill has not been applied yet in the current billing period.
 */
const isBillPending = (bill) => {
    if (!bill.lastApplied) return true; // Never applied

    const now = new Date();
    const last = new Date(bill.lastApplied);

    if (bill.frequency === 'Monthly') {
        // Pending if lastApplied was in a previous month
        return last.getFullYear() < now.getFullYear() ||
            (last.getFullYear() === now.getFullYear() && last.getMonth() < now.getMonth());
    }

    if (bill.frequency === 'Weekly') {
        // Pending if more than 7 days have passed since last applied
        const diffMs = now - last;
        return diffMs >= 7 * 24 * 60 * 60 * 1000;
    }

    if (bill.frequency === 'Yearly') {
        // Pending if lastApplied was in a previous year
        return last.getFullYear() < now.getFullYear();
    }

    return false;
};

// ─── Controllers ───────────────────────────────────────────────────────────

// GET all recurring bills (includes isPending status)
exports.getBills = async (req, res) => {
    try {
        const bills = await RecurringBill.find().sort({ createdAt: -1 });
        const withStatus = bills.map(b => ({
            ...b.toObject(),
            isPending: isBillPending(b),
        }));
        res.status(200).json(withStatus);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST — create a new recurring bill
exports.createBill = async (req, res) => {
    try {
        const bill = await RecurringBill.create(req.body);

        // Activity Log
        await createLog({
            actorId: req.user._id,
            actorName: req.user.fullName,
            actorRole: req.user.role,
            module: 'FINANCE',
            action: 'bill_created',
            message: `Created recurring bill: ${bill.name} (₱${bill.amount})`,
            meta: { billId: bill._id }
        });

        res.status(201).json({ ...bill.toObject(), isPending: isBillPending(bill) });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// DELETE a recurring bill
exports.deleteBill = async (req, res) => {
    try {
        const bill = await RecurringBill.findById(req.params.id);
        if (!bill) return res.status(404).json({ error: 'Bill not found' });

        await RecurringBill.findByIdAndDelete(req.params.id);

        // Activity Log
        await createLog({
            actorId: req.user._id,
            actorName: req.user.fullName,
            actorRole: req.user.role,
            module: 'FINANCE',
            action: 'bill_deleted',
            message: `Deleted recurring bill: ${bill.name}`,
            meta: { billId: req.params.id }
        });

        res.status(200).json({ message: 'Bill removed' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// PATCH — update an existing bill
exports.updateBill = async (req, res) => {
    try {
        // Sanitize req.body by only extracting allowed fields
        const { name, category, amount, frequency, lastApplied, isActive } = req.body;
        const bill = await RecurringBill.findByIdAndUpdate(req.params.id, { name, category, amount, frequency, lastApplied, isActive }, { returnDocument: 'after', runValidators: true });

        // Activity Log
        await createLog({
            actorId: req.user._id,
            actorName: req.user.fullName,
            actorRole: req.user.role,
            module: 'FINANCE',
            action: 'bill_updated',
            message: `Updated recurring bill details: ${bill.name}`,
            meta: { billId: bill._id }
        });

        res.status(200).json({ ...bill.toObject(), isPending: isBillPending(bill) });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /apply — Post all pending bills as Finance expenses in one click
exports.applyPendingBills = async (req, res) => {
    try {
        const bills = await RecurringBill.find({ isActive: true });
        const pending = bills.filter(isBillPending);

        if (pending.length === 0) {
            return res.status(200).json({ applied: 0, message: 'No pending bills this period.' });
        }

        const now = new Date();
        const month = now.toLocaleString('en-PH', { month: 'long', year: 'numeric' });

        const expenses = await Promise.all(pending.map(async (bill) => {
            const expense = await Expense.create({
                title: `${bill.name} (${bill.frequency} Bill)`,
                category: bill.category,
                amount: bill.amount,
                description: `Auto-applied recurring bill for ${month}`,
            });
            await RecurringBill.findByIdAndUpdate(bill._id, { lastApplied: now });
            return expense;
        }));

        // Activity Log
        await createLog({
            actorId: req.user._id,
            actorName: req.user.fullName,
            actorRole: req.user.role,
            module: 'FINANCE',
            action: 'bills_applied',
            message: `Manually applied ${expenses.length} recurring bills for ${month}`,
            meta: { appliedCount: expenses.length }
        });

        res.status(200).json({ applied: expenses.length, expenses });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
