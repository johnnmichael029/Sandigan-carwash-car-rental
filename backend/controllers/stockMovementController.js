const StockMovement = require('../models/stockMovementModel');

exports.getAnalytics = async (req, res) => {
    try {
        const movements = await StockMovement.find()
            .populate('inventoryItem', 'name unit costPerUnit category')
            .sort({ createdAt: -1 });

        // Basic analytics processing
        res.status(200).json(movements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAnalyticsSummary = async (req, res) => {
    try {
        // Aggregate outbound movements over the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const summary = await StockMovement.aggregate([
            {
                $match: {
                    type: 'Outbound',
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $lookup: {
                    from: 'inventories', // make sure this matches exactly the DB collection name
                    localField: 'inventoryItem',
                    foreignField: '_id',
                    as: 'itemData'
                }
            },
            { $unwind: '$itemData' },
            {
                $group: {
                    _id: '$inventoryItem',
                    itemName: { $first: '$itemData.name' },
                    unit: { $first: '$itemData.unit' },
                    costPerUnit: { $first: '$itemData.costPerUnit' },
                    totalQuantityUsed: { $sum: { $abs: '$quantity' } }
                }
            },
            {
                $project: {
                    itemName: 1,
                    unit: 1,
                    totalQuantityUsed: 1,
                    totalCost: { $multiply: ['$totalQuantityUsed', '$costPerUnit'] }
                }
            },
            { $sort: { totalQuantityUsed: -1 } }
        ]);

        res.status(200).json(summary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getItemHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const history = await StockMovement.find({ inventoryItem: id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.status(200).json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.logMovement = async (data) => {
    try {
        const movement = new StockMovement(data);
        await movement.save();
    } catch (err) {
        console.error("Failed to log stock movement: ", err);
    }
};
