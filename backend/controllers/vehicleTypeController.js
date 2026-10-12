const VehicleType = require('../models/vehicleTypeModel');
const Booking = require('../models/bookingModel');
const { STANDARD_VEHICLE_CATEGORIES, mapToVehicleCategory } = require('../utils/vehicleCategorizer');

exports.getVehicleTypes = async (req, res) => {
    try {
        // 1. Check if any vehicle types are missing category, and backfill
        const unpopulated = await VehicleType.find({ $or: [{ category: { $exists: false } }, { category: null }, { category: '' }] });
        if (unpopulated.length > 0) {
            for (const doc of unpopulated) {
                doc.category = mapToVehicleCategory(doc.name);
                await doc.save();
            }
        }

        // 2. Discover distinct vehicle types from bookings that are not in VehicleType library
        const bookingTypes = await Booking.distinct('vehicleType');
        const existingDocs = await VehicleType.find({});
        const existingNames = new Set(existingDocs.map(d => d.name.toLowerCase()));

        for (const rawName of bookingTypes) {
            if (rawName && typeof rawName === 'string' && rawName.trim()) {
                const trimmed = rawName.trim();
                if (!existingNames.has(trimmed.toLowerCase())) {
                    await VehicleType.create({
                        name: trimmed,
                        category: mapToVehicleCategory(trimmed),
                        color: '#23A0CE',
                        textColor: '#FFFFFF',
                        isActive: true
                    });
                    existingNames.add(trimmed.toLowerCase());
                }
            }
        }

        const types = await VehicleType.find({}).sort({ name: 1 });
        res.status(200).json(types);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch vehicle types', details: err.message });
    }
};

exports.createVehicleType = async (req, res) => {
    try {
        const { name, color, textColor, category } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const existing = await VehicleType.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existing) return res.status(400).json({ error: 'Vehicle Type already exists' });

        const assignedCategory = category && category.trim() ? category.trim() : mapToVehicleCategory(name);

        const newType = await VehicleType.create({
            name,
            color: color || '#23A0CE',
            textColor: textColor || '#FFFFFF',
            category: assignedCategory
        });

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
