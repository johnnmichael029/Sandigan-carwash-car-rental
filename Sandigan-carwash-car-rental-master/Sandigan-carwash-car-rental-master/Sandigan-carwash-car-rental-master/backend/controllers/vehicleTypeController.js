const VehicleType = require('../models/vehicleTypeModel');

exports.getVehicleTypes = async (req, res) => {
    try {
        const types = await VehicleType.find({}).sort({ name: 1 });
        res.status(200).json(types);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch vehicle types', details: err.message });
    }
};

exports.createVehicleType = async (req, res) => {
    try {
        const { name, color, textColor } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const existing = await VehicleType.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existing) return res.status(400).json({ error: 'Vehicle Type already exists' });

        const newType = await VehicleType.create({ name, color, textColor });

        if (req.app.get('io')) req.app.get('io').emit('vehicle_types_updated');

        res.status(201).json(newType);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create vehicle type', details: err.message });
    }
};

exports.updateVehicleType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (name) {
            const existing = await VehicleType.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, _id: { $ne: id } });
            if (existing) return res.status(400).json({ error: 'Vehicle Type already exists' });
        }

        const updated = await VehicleType.findByIdAndUpdate(id, req.body, { returnDocument: 'after', runValidators: true });
        if (!updated) return res.status(404).json({ error: 'Vehicle Type not found' });

        if (req.app.get('io')) req.app.get('io').emit('vehicle_types_updated');

        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update vehicle type', details: err.message });
    }
};

exports.deleteVehicleType = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await VehicleType.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ error: 'Vehicle Type not found' });

        if (req.app.get('io')) req.app.get('io').emit('vehicle_types_updated');

        res.status(200).json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete vehicle type', details: err.message });
    }
};
