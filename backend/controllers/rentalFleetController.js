const RentalFleet = require('../models/rentalFleetModel');
const CarRental = require('../models/carRentalModel');
const { invalidatePrefixes } = require('../utils/cache');


// GET all vehicles — PUBLIC (for landing page & booking dropdown)
// Only vehicles currently Active on the road or marked under maintenance are flagged unavailable.
const getFleet = async (req, res) => {
    try {
        const [vehicles, activeRentals] = await Promise.all([
            RentalFleet.find().sort({ createdAt: 1 }),
            // Only vehicles currently active on the road right now
            CarRental.find({ status: 'Active' })
                .select('vehicleId rentalStartDate returnDate')
                .lean()
        ]);

        // Build lookup map of active on-road vehicle details
        const activeRentalMap = new Map();
        activeRentals.forEach(r => {
            if (r.vehicleId) {
                activeRentalMap.set(r.vehicleId.toString(), {
                    startDate: r.rentalStartDate,
                    endDate: r.returnDate
                });
            }
        });

        // Override isAvailable based on active on-road status & admin maintenance
        const result = vehicles.map(v => {
            const obj = v.toObject();
            const activeRental = activeRentalMap.get(v._id.toString());
            const isOnRoad = !!activeRental;
            const adminForcedUnavailable = v.isAvailable === false;

            obj.isAvailable = !adminForcedUnavailable && !isOnRoad;

            if (activeRental) {
                obj.activeRentalStart = activeRental.startDate;
                obj.activeRentalEnd = activeRental.endDate;
            }

            if (!obj.isAvailable) {
                if (adminForcedUnavailable && v.unavailableReason) {
                    // Admin explicitly set a reason — always takes priority
                    obj.unavailableReason = v.unavailableReason;
                } else if (isOnRoad) {
                    // Auto-detected: vehicle currently has an active rental
                    obj.unavailableReason = 'In Use';
                } else {
                    obj.unavailableReason = v.unavailableReason || 'Unavailable';
                }
            } else {
                obj.unavailableReason = '';
            }
            return obj;
        });

        // Sort: available first
        result.sort((a, b) => b.isAvailable - a.isAvailable);

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch rental fleet.' });
    }
};


// GET all vehicles including unavailable — ADMIN only
const getFleetAdmin = async (req, res) => {
    try {
        const vehicles = await RentalFleet.find().sort({ createdAt: 1 });
        res.json(vehicles);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch rental fleet.' });
    }
};

// POST — create a new vehicle — ADMIN only
const createVehicle = async (req, res) => {
    const { vehicleName, vehicleType, seats, pricePerDay, imageBase64, isAvailable, unavailableReason, description } = req.body;

    if (!vehicleName || !vehicleType || !seats || !pricePerDay) {
        return res.status(400).json({ error: 'Vehicle name, type, seats, and price are required.' });
    }

    try {
        const vehicle = await RentalFleet.create({
            vehicleName,
            vehicleType,
            seats: Number(seats),
            pricePerDay: Number(pricePerDay),
            imageBase64: imageBase64 || null,
            isAvailable: isAvailable !== undefined ? isAvailable : true,
            unavailableReason: isAvailable !== false ? '' : (unavailableReason || ''),
            description: description || ''
        });

        invalidatePrefixes('fleet', 'rental', 'sandi');
        const io = req.app.get('io');
        if (io) io.emit('fleet_updated');

        res.status(201).json(vehicle);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to create vehicle.' });
    }
};

// PUT — update a vehicle — ADMIN only
const updateVehicle = async (req, res) => {
    const { id } = req.params;
    const { vehicleName, vehicleType, seats, pricePerDay, imageBase64, isAvailable, unavailableReason, description } = req.body;

    try {
        const vehicle = await RentalFleet.findByIdAndUpdate(
            id,
            {
                vehicleName,
                vehicleType,
                seats: Number(seats),
                pricePerDay: Number(pricePerDay),
                imageBase64,
                isAvailable,
                unavailableReason: isAvailable !== false ? '' : (unavailableReason || ''),
                description
            },
            { returnDocument: 'after', runValidators: true }
        );

        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

        invalidatePrefixes('fleet', 'rental', 'sandi');
        const io = req.app.get('io');
        if (io) io.emit('fleet_updated');

        res.json(vehicle);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update vehicle.' });
    }
};

// DELETE a vehicle — ADMIN only
const deleteVehicle = async (req, res) => {
    const { id } = req.params;
    try {
        const vehicle = await RentalFleet.findByIdAndDelete(id);
        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

        invalidatePrefixes('fleet', 'rental', 'sandi');
        const io = req.app.get('io');
        if (io) io.emit('fleet_updated');

        res.json({ message: 'Vehicle deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete vehicle.' });
    }
};

module.exports = { getFleet, getFleetAdmin, createVehicle, updateVehicle, deleteVehicle };
