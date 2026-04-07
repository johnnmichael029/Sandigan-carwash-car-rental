const Bay = require('../models/bayModel');

// @desc    Get all bays
// @route   GET /api/bays
// @access  Private/Admin
const getBays = async (req, res) => {
    try {
        const bays = await Bay.find().sort({ name: 1 });
        res.status(200).json(bays);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new bay
// @route   POST /api/bays
// @access  Private/Admin
const createBay = async (req, res) => {
    try {
        const { name, type, description } = req.body;
        const bay = new Bay({ name, type, description });
        const createdBay = await bay.save();
        res.status(201).json(createdBay);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a bay
// @route   PUT /api/bays/:id
// @access  Private/Admin
const updateBay = async (req, res) => {
    try {
        const bay = await Bay.findById(req.params.id);
        if (bay) {
            bay.name = req.body.name || bay.name;
            bay.type = req.body.type || bay.type;
            bay.status = req.body.status || bay.status;
            bay.description = req.body.description || bay.description;

            const updatedBay = await bay.save();
            res.status(200).json(updatedBay);
        } else {
            res.status(404).json({ message: 'Bay not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a bay
// @route   DELETE /api/bays/:id
// @access  Private/Admin
const deleteBay = async (req, res) => {
    try {
        const bay = await Bay.findById(req.params.id);
        if (bay) {
            await bay.deleteOne();
            res.status(200).json({ message: 'Bay removed' });
        } else {
            res.status(404).json({ message: 'Bay not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getBays,
    createBay,
    updateBay,
    deleteBay
};
