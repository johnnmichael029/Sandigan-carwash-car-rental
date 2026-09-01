const PurchaseOrder = require('../models/purchaseOrderModel');
const Inventory = require('../models/inventoryModel');
const AccountPayable = require('../models/payableModel');
const Vendor = require('../models/vendorModel');
const { logMovement } = require('./stockMovementController');
const { createLog } = require('./activityLogController');

exports.getPOs = async (req, res) => {
    try {
        const pos = await PurchaseOrder.find()
            .populate('vendor', 'name contactPerson phone email')
            .populate('items.inventoryItem', 'name unit')
            .sort({ createdAt: -1 });
        res.status(200).json(pos);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createPO = async (req, res) => {
    try {
        const po = new PurchaseOrder({ ...req.body, createdBy: req.user ? req.user.id : null });
        let total = 0;
        po.items.forEach(item => {
            item.lineTotal = item.quantity * item.unitCost;
            total += item.lineTotal;
        });
        po.totalAmount = total;
        await po.save();

        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'INVENTORY',
                action: 'po_created',
                message: `Created Purchase Order: ${po.poNumber}`,
                meta: { id: po._id, poNumber: po.poNumber }
            });
        }
        res.status(201).json(po);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updatePO = async (req, res) => {
    try {
        const existingPO = await PurchaseOrder.findById(req.params.id);
        if (!existingPO) return res.status(404).json({ error: 'PO not found' });
        if (existingPO.status === 'Received') return res.status(400).json({ error: 'Cannot edit a received PO.' });

        // Recalculate totals if items changed
        const updates = { ...req.body };
        if (updates.items && updates.items.length > 0) {
            let total = 0;
            updates.items.forEach(item => {
                item.lineTotal = item.quantity * item.unitCost;
                total += item.lineTotal;
            });
            updates.totalAmount = total;
        }

        const po = await PurchaseOrder.findByIdAndUpdate(req.params.id, updates, { new: true })
            .populate('vendor', 'name contactPerson phone email')
            .populate('items.inventoryItem', 'name unit');
        res.status(200).json(po);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.receivePO = async (req, res) => {
    try {
        const poId = req.params.id;
        const po = await PurchaseOrder.findById(poId).populate('items.inventoryItem').populate('vendor', 'name category');

        if (!po) return res.status(404).json({ error: "PO not found" });
        if (po.status === 'Received') return res.status(400).json({ error: "PO already received" });

        // ─── 1. Update Inventory Stock & Log Movements ───────────────
        const itemNames = [];
        for (const item of po.items) {
            const inventory = await Inventory.findById(item.inventoryItem._id);
            if (inventory) {
                const oldStock = inventory.currentStock;
                inventory.currentStock += item.quantity;
                inventory.lastRestocked = new Date();
                inventory.costPerUnit = item.unitCost;
                await inventory.save();

                itemNames.push(`${inventory.name} x${item.quantity}`);

                await logMovement({
                    inventoryItem: inventory._id,
                    type: 'Inbound',
                    quantity: item.quantity,
                    previousStock: oldStock,
                    newStock: inventory.currentStock,
                    reason: `PO Received: ${po.poNumber}`,
                    performedBy: req.user ? req.user.id : null,
                    performedByName: req.user ? req.user.fullName : 'System'
                });
            }
        }

        po.status = 'Received';
        po.receivedDate = new Date();
        await po.save();

        // ─── 2. Auto-Create Payable Bill in Accounts Payable ────────
        const vendorName = po.vendor?.name || 'Supplier';
        
        // Calculate due date from vendor's payment terms
        const vendor = await Vendor.findById(po.vendor._id);
        const termsMap = { 'Cash on Delivery': 0, 'Net 7': 7, 'Net 15': 15, 'Net 30': 30, 'Net 60': 60 };
        const termDays = termsMap[vendor?.paymentTerms] ?? 30;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + termDays);

        // Generate sequential bill number (INV-MMDDYY-XX) — same logic as payableController
        const today = new Date();
        const phTime = new Date(today.getTime() + (8 * 60 * 60 * 1000)); // UTC+8
        const mm = phTime.getUTCMonth() + 1;
        const dd = String(phTime.getUTCDate()).padStart(2, '0');
        const yy = String(phTime.getUTCFullYear()).slice(-2);
        const dateStr = `${mm}${dd}${yy}`;
        const billPrefix = `INV-${dateStr}-`;

        const billsToday = await AccountPayable.find({
            billNumber: new RegExp(`^${billPrefix}`)
        });
        let highestSeq = 0;
        billsToday.forEach(b => {
            const parts = b.billNumber.split('-');
            const seq = parseInt(parts[parts.length - 1]);
            if (!isNaN(seq) && seq > highestSeq) highestSeq = seq;
        });
        const finalBillNumber = `${billPrefix}${String(highestSeq + 1).padStart(2, '0')}`;

        const bill = await AccountPayable.create({
            vendorId: po.vendor._id,
            billNumber: finalBillNumber,
            description: `PO ${po.poNumber} — ${itemNames.join(', ')}`,
            amount: po.totalAmount,
            dueDate: dueDate,
            status: 'Unpaid',
            notes: `Auto-generated from Purchase Order ${po.poNumber}`
        });

        // Update vendor totalOwed (reuse vendor already fetched above)
        if (vendor) {
            vendor.totalOwed += po.totalAmount;
            await vendor.save();
        }

        // NOTE: Expense is NOT created here. It will be recorded when the bill
        // is actually PAID via Accounts Payable → recordBillPayment().

        // ─── 3. Activity Log ────────────────────────────────────────
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'INVENTORY',
                action: 'po_received',
                message: `Received Goods for ${po.poNumber}. Bill ${bill.billNumber} created in AP (₱${po.totalAmount.toLocaleString()}).`,
                meta: { id: po._id, poNumber: po.poNumber, billId: bill._id, billNumber: bill.billNumber }
            });
        }

        res.status(200).json(po);
    } catch (err) {
        console.error('[receivePO] Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.deletePO = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) return res.status(404).json({ error: 'PO not found' });
        if (po.status === 'Received') {
            return res.status(400).json({ error: "Cannot delete a received PO." });
        }
        await PurchaseOrder.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "PO deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
