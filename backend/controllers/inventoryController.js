const Inventory = require('../models/inventoryModel');

exports.getInventory = async (req, res) => {
    try {
        const items = await Inventory.find().sort({ name: 1 });
        res.status(200).json(items);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.addInventoryItem = async (req, res) => {
    try {
        const newItem = new Inventory(req.body);
        await newItem.save();
        res.status(201).json(newItem);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        // Allow updating any of these fields; if stock changes we update lastRestocked too
        const allowed = ['name', 'category', 'currentStock', 'unit', 'reorderPoint', 'costPerUnit', 'supplier'];
        const updates = {};
        allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
        if (updates.currentStock !== undefined) updates.lastRestocked = Date.now();
        const item = await Inventory.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        res.status(200).json(item);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteInventoryItem = async (req, res) => {
    try {
        await Inventory.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Item removed from inventory' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
