const AccountPayable = require('../models/payableModel');
const Vendor = require('../models/vendorModel');
const Expense = require('../models/expenseModel');
const ActivityLog = require('../models/activityLogModel'); // Corrected filename to match the filesystem
const mongoose = require('mongoose');

// 1. Get all bills with search/filter
const getAllBills = async (req, res) => {
    try {
        const { status, vendorId, overdue } = req.query;
        let query = {};

        if (status) query.status = status;
        if (vendorId) query.vendorId = vendorId;
        if (overdue === 'true') {
            query.status = { $ne: 'Paid' };
            query.dueDate = { $lt: new Date() };
        }

        const bills = await AccountPayable.find(query)
            .populate('vendorId', 'name')
            .sort({ dueDate: 1 });

        res.json(bills);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Create Bill (Generates sequential ID: INV-MMDDYY-XX)
const createBill = async (req, res) => {
    try {
        // Auto-generate Bill Number
        const today = new Date();
        // Adjust to Philippines Time (UTC+8) for consistent sequence numbering
        const phTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
        const mm = phTime.getUTCMonth() + 1;
        const dd = String(phTime.getUTCDate()).padStart(2, '0');
        const yy = String(phTime.getUTCFullYear()).slice(-2);
        const dateStr = `${mm}${dd}${yy}`;
        const prefix = `INV-${dateStr}-`;


        // Search ALL existing bills for today to find the highest sequence
        const billsToday = await AccountPayable.find({
            billNumber: new RegExp(`^${prefix}`)
        });

        let highestSeq = 0;
        billsToday.forEach(b => {
            const parts = b.billNumber.split('-');
            const seq = parseInt(parts[parts.length - 1]);
            if (!isNaN(seq) && seq > highestSeq) {
                highestSeq = seq;
            }
        });

        const nextSequence = String(highestSeq + 1).padStart(2, '0');
        const finalBillNumber = `${prefix}${nextSequence}`;


        const bill = await AccountPayable.create({
            ...req.body,
            billNumber: finalBillNumber
        });

        // Update Vendor's totalOwed stats
        const vendor = await Vendor.findById(bill.vendorId);
        if (vendor) {
            vendor.totalOwed += bill.amount;
            await vendor.save();
        }

        res.status(201).json(bill);
    } catch (err) {
        console.error("Create Bill Error:", err);
        res.status(400).json({ error: err.message });
    }
};

// 3. Record Payment (The critical part: turns Debt into Expense)
const recordBillPayment = async (req, res) => {
    try {
        const { amount, method, reference, date, recordedBy } = req.body;
        const bill = await AccountPayable.findById(req.params.id);
        if (!bill) return res.status(404).json({ error: 'Bill not found' });

        // Add to payment sub-documents
        bill.payments.push({
            amount,
            date: date || new Date(),
            method: method || 'Cash',
            reference: reference || '',
            recordedBy: recordedBy || null
        });

        // Update overall payment sum
        bill.amountPaid += parseFloat(amount);

        // Auto-status update handled by schema .pre('save')
        await bill.save();

        // --- SYNC TO FINANCIALS ---
        // A. Update Vendor stats
        const vendor = await Vendor.findById(bill.vendorId);
        if (vendor) {
            vendor.totalOwed -= parseFloat(amount);
            vendor.totalPaid += parseFloat(amount);
            await vendor.save();
        }

        // B. Generate Financial Expense (Actual Cash Flow)
        // We use Math.abs to ensure amount is positive and avoid date drift by using latest server time
        const syncExpense = await Expense.create({
            title: `Bill Payment: ${bill.billNumber} — ${vendor?.name || 'Supplier'}`,
            amount: Math.abs(parseFloat(amount)),
            category: vendor?.category || 'Supplies',
            description: `Payment for bill: ${bill.description || 'N/A'}. Method: ${method}. Ref: ${reference || 'None'}`,
            date: date ? new Date(date) : new Date() 
        });

        // C. Record Activity Log (Ensures visibility in Dashboard)
        await ActivityLog.create({
            action: 'payment_recorded',
            message: `Paid ₱${parseFloat(amount).toLocaleString()} to ${vendor?.name || 'Supplier'} (Bill: ${bill.billNumber})`,
            actorId: req.user?._id || req.user?.id || null,
            actorName: req.user?.fullName || 'System',
            actorRole: req.user?.role || 'system',
            meta: { billId: bill._id, expenseId: syncExpense._id, amountPaid: parseFloat(amount) }
        });

        res.json({ message: 'Payment recorded successfully.', bill });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. Get Global Payable Dashboard Stats (Owed, Overdue, Upcoming)
const getPayableSummary = async (req, res) => {
    try {
        const allBills = await AccountPayable.find({});
        const today = new Date();
        const next7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const totalDebt = allBills.reduce((sum, b) => sum + b.balanceOwed, 0);
        const overdueDebt = allBills.filter(b => b.status !== 'Paid' && b.dueDate < today).reduce((sum, b) => sum + b.balanceOwed, 0);
        const upcomingDebt = allBills.filter(b => b.status !== 'Paid' && b.dueDate >= today && b.dueDate <= next7Days).reduce((sum, b) => sum + b.balanceOwed, 0);
        const totalPaid = allBills.reduce((sum, b) => sum + b.amountPaid, 0);

        res.json({
            totalDebt,
            overdueDebt,
            upcomingDebt,
            totalPaid,
            count: allBills.filter(b => b.status !== 'Paid').length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 5. Get Next Sequential Bill Number (INV-MMDDYY-XX)
const getNextBillNumber = async (req, res) => {
    try {
        const today = new Date();
        const phTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
        const mm = phTime.getUTCMonth() + 1;
        const dd = String(phTime.getUTCDate()).padStart(2, '0');
        const yy = String(phTime.getUTCFullYear()).slice(-2);
        const dateStr = `${mm}${dd}${yy}`;
        const prefix = `INV-${dateStr}-`;

        const billsToday = await AccountPayable.find({
            billNumber: new RegExp(`^${prefix}`)
        });

        let highestSeq = 0;
        billsToday.forEach(b => {
            const parts = b.billNumber.split('-');
            const seq = parseInt(parts[parts.length - 1]);
            if (!isNaN(seq) && seq > highestSeq) {
                highestSeq = seq;
            }
        });

        const nextBillNumber = `${prefix}${String(highestSeq + 1).padStart(2, '0')}`;
        console.log("Backend predicted next bill number:", nextBillNumber);
        res.json({ nextBillNumber });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getAllBills,
    createBill,
    recordBillPayment,
    getPayableSummary,
    getNextBillNumber
};
