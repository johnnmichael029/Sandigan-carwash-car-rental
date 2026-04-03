const Vendor = require('../models/vendorModel');
const AccountPayable = require('../models/payableModel');
const { createLog } = require('./activityLogController');

// 1. Get all vendors with spent/debt summary
const getAllVendors = async (req, res) => {
    try {
        const vendors = await Vendor.find().sort({ name: 1 });

        // Recalculate totals (Self-healing spent stats)
        const updatedVendors = await Promise.all(vendors.map(async (v) => {
            const payables = await AccountPayable.find({ vendorId: v._id });
            const totalOwed = payables.reduce((sum, p) => sum + (p.status !== 'Paid' ? p.balanceOwed : 0), 0);
            const totalPaid = payables.reduce((sum, p) => sum + p.amountPaid, 0);

            if (v.totalOwed !== totalOwed || v.totalPaid !== totalPaid) {
                v.totalOwed = totalOwed;
                v.totalPaid = totalPaid;
                await v.save();
            }
            return v;
        }));

        res.json(updatedVendors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Create Vendor
const createVendor = async (req, res) => {
    try {
        const newVendor = await Vendor.create(req.body);

        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'VENDOR',
                action: 'vendor_created',
                message: `Added new vendor: ${newVendor.name}`,
                meta: { id: newVendor._id, name: newVendor.name }
            });
        }

        res.status(201).json(newVendor);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// 3. Update Vendor
const updateVendor = async (req, res) => {
    try {
        // Sanitize req.body by only extracting allowed fields
        const {
            name, category, contactPerson, phone,
            email, address, paymentTerms, notes, isActive
        } = req.body;

        const updated = await Vendor.findByIdAndUpdate(
            req.params.id,
            { name, category, contactPerson, phone, email, address, paymentTerms, notes, isActive },
            { returnDocument: 'after', runValidators: true }
        );

        // Audit Log
        if (req.user && updated) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'VENDOR',
                action: 'vendor_updated',
                message: `Updated vendor details for: ${updated.name}`,
                meta: { id: updated._id, name: updated.name }
            });
        }

        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};


// 4. Delete Vendor (Only if no bills exist)
const deleteVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

        const bills = await AccountPayable.findOne({ vendorId: req.params.id });
        if (bills) return res.status(400).json({ error: 'Cannot delete vendor with existing transaction history.' });

        await Vendor.findByIdAndDelete(req.params.id);

        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'VENDOR',
                action: 'vendor_deleted',
                message: `Removed vendor: ${vendor.name}`,
                meta: { id: vendor._id, name: vendor.name }
            });
        }

        res.json({ message: 'Vendor deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 5. Get Vendor Profile + Bills Statement
const getVendorStats = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

        const history = await AccountPayable.find({ vendorId: vendor._id }).sort({ dueDate: -1 });
        res.json({ vendor, history });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getAllVendors,
    createVendor,
    updateVendor,
    deleteVendor,
    getVendorStats
};
