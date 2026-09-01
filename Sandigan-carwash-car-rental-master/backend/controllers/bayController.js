const Bay = require('../models/bayModel');
const Booking = require('../models/bookingModel');

// @desc    Get all bays
// @route   GET /api/bays
// @access  Private/Admin
const getBays = async (req, res) => {
    try {
        let bays = await Bay.find().sort({ name: 1 });
        
        // Lazy auto-sync for missing currentBookingId
        const updatedBays = await Promise.all(bays.map(async (bay) => {
            if (bay.status === 'Occupied' && !bay.currentBookingId) {
                const activeBooking = await Booking.findOne({ bayId: bay._id, status: 'In-progress' });
                if (activeBooking) {
                    bay.currentBookingId = activeBooking.batchId;
                    await bay.save();
                }
            }
            return bay;
        }));

        res.status(200).json(updatedBays);
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

        // Emit Socket.io update for real-time UI
        const io = req.app.get('io');
        if (io) io.emit('update_bay', createdBay);

        // Update the Bay modal if it add a new Bay
        if (io) io.emit('add_bay', createdBay);

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

            // Handle startTime logic
            if (req.body.status && req.body.status !== bay.status) {
                if (req.body.status === 'Occupied') {
                    bay.startTime = new Date();
                } else if (req.body.status === 'Available') {
                    bay.startTime = null;
                }
            }

            bay.status = req.body.status || bay.status;
            bay.description = req.body.description || bay.description;

            const updatedBay = await bay.save();

            // Emit Socket.io update for real-time UI
            const io = req.app.get('io');
            if (io) io.emit('update_bay', updatedBay);

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

            // Notify UI of removal
            const io = req.app.get('io');
            if (io) io.emit('delete_bay', req.params.id);

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
