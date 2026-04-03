const Inventory = require('../models/inventoryModel');
const { createLog } = require('./activityLogController');

exports.getInventory = async (req, res) => {
    try {
        const items = await Inventory.find().sort({ name: 1 });
        res.status(200).json(items);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.addInventoryItem = async (req, res) => {
    try {
        const item = await Inventory.create(req.body);
        
        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'INVENTORY',
                action: 'inventory_added',
                message: `Added new inventory item: ${item.name} (${item.currentStock} ${item.unit})`,
                meta: { id: item._id, name: item.name, stock: item.currentStock }
            });
        }

        res.status(201).json(item);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const allowed = ['name', 'category', 'currentStock', 'unit', 'reorderPoint', 'costPerUnit', 'supplier'];
        const updates = {};
        allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
        if (updates.currentStock !== undefined) updates.lastRestocked = Date.now();
        
        const item = await Inventory.findByIdAndUpdate(id, updates, { returnDocument: 'after', runValidators: true });
        
        // Audit Log
        if (req.user && item) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'INVENTORY',
                action: 'inventory_updated',
                message: `Updated inventory item: ${item.name}`,
                meta: { id, name: item.name, changes: Object.keys(updates) }
            });
        }

        res.status(200).json(item);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteInventoryItem = async (req, res) => {
    try {
        const item = await Inventory.findById(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found' });

        await Inventory.findByIdAndDelete(req.params.id);
        
        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'INVENTORY',
                action: 'inventory_deleted',
                message: `Removed item from inventory: ${item.name}`,
                meta: { id: item._id, name: item.name }
            });
        }

        res.status(200).json({ message: 'Item removed from inventory' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
