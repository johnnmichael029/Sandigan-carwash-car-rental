const RentalFleet = require('../models/rentalFleetModel');
const CarRental = require('../models/carRentalModel');


// GET all vehicles — PUBLIC (for landing page)
// Derives availability from actual rentals (Pending/Confirmed/Active),
// so it's always accurate even if isAvailable flag is stale.
const getFleet = async (req, res) => {
    try {
        const [vehicles, activeRentals] = await Promise.all([
            RentalFleet.find().sort({ createdAt: 1 }),
            // Get all vehicle IDs that are currently tied to an active rental
            CarRental.distinct('vehicleId', {
                status: { $in: ['Pending', 'Confirmed', 'Active'] }
            })
        ]);

        // Build a fast lookup set of locked vehicle IDs
        const lockedIds = new Set(activeRentals.map(id => id.toString()));

        // Override isAvailable based on live rental data
        const result = vehicles.map(v => {
            const obj = v.toObject();
            obj.isAvailable = !lockedIds.has(v._id.toString());
            return obj;
        });

        // Sort: available first, unavailable last
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
    const { vehicleName, vehicleType, seats, pricePerDay, imageBase64, isAvailable, description } = req.body;

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
            description: description || ''
        });

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
    const { vehicleName, vehicleType, seats, pricePerDay, imageBase64, isAvailable, description } = req.body;

    try {
        const vehicle = await RentalFleet.findByIdAndUpdate(
            id,
            { vehicleName, vehicleType, seats: Number(seats), pricePerDay: Number(pricePerDay), imageBase64, isAvailable, description },
            { returnDocument: 'after', runValidators: true }
        );

        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

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

        const io = req.app.get('io');
        if (io) io.emit('fleet_updated');

        res.json({ message: 'Vehicle deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete vehicle.' });
    }
};

module.exports = { getFleet, getFleetAdmin, createVehicle, updateVehicle, deleteVehicle };
