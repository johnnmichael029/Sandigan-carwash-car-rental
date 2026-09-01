const Asset = require('../models/assetModel');

// @desc    Get all assets
// @route   GET /api/assets
// @access  Private/Admin
const getAssets = async (req, res) => {
    try {
        const { search } = req.query;
        let filter = {};

        if (search) {
            const regex = new RegExp(search, 'i');
            filter = {
                $or: [
                    { name: regex },
                    { category: regex },
                    { serialNumber: regex },
                    { status: regex }
                ]
            };
        }

        const assets = await Asset.find(filter).populate('bayId', 'name').sort({ createdAt: -1 });
        res.status(200).json(assets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new asset
// @route   POST /api/assets
// @access  Private/Admin
const createAsset = async (req, res) => {
    try {
        const { name, category, serialNumber, purchaseDate, serviceCycleBookings, bayId } = req.body;
        const asset = new Asset({ name, category, serialNumber, purchaseDate, serviceCycleBookings, bayId });
        const createdAsset = await asset.save();
        res.status(201).json(createdAsset);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update an asset
// @route   PUT /api/assets/:id
// @access  Private/Admin
const updateAsset = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);
        if (!asset) return res.status(404).json({ message: 'Asset not found' });

        const fields = ['name', 'category', 'serialNumber', 'purchaseDate', 'serviceCycleBookings', 'usageCounter', 'status', 'bayId'];
        fields.forEach(field => {
            if (req.body[field] !== undefined) asset[field] = req.body[field];
        });

        const updatedAsset = await asset.save();
        res.status(200).json(updatedAsset);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete an asset
// @route   DELETE /api/assets/:id
// @access  Private/Admin
const deleteAsset = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);
        if (!asset) return res.status(404).json({ message: 'Asset not found' });
        await asset.deleteOne();
        res.status(200).json({ message: 'Asset removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Increment usage counter for assets at a specific bay (called when booking completes)
// @route   POST /api/assets/increment-usage/:bayId
// @access  Private
const incrementUsageByBay = async (req, res) => {
    try {
        const { bayId } = req.params;
        const assets = await Asset.find({ bayId, status: { $ne: 'Retired' } });

        const alerts = [];
        for (const asset of assets) {
            asset.usageCounter += 1;

            // Check if usage has hit the maintenance threshold
            if (asset.usageCounter >= asset.serviceCycleBookings && asset.status === 'Active') {
                asset.status = 'Degraded';
                alerts.push({ assetId: asset._id, name: asset.name, message: `${asset.name} has reached its service cycle limit (${asset.serviceCycleBookings} uses). Maintenance recommended.` });
            }
            await asset.save();
        }

        res.status(200).json({ updatedCount: assets.length, alerts });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAssets,
    createAsset,
    updateAsset,
    deleteAsset,
    incrementUsageByBay
};
