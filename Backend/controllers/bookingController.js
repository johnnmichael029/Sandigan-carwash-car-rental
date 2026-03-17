const moongose = require('mongoose');
const Booking = require('../models/workoutsModel');

// Get all bookings
const getBookings = async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.status(200).json(bookings);
    }
    catch (err) {
        console.error("❌ Error fetching bookings:", err);
        res.status(500).json({ error: "Error fetching bookings." });
    }
}


// Get a single booking
const getBooking = async (req, res) => {
    const { id } = req.params;
    try {
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ error: "Booking not found." });
        }
        res.status(200).json(booking);
    }
    catch (err) {
        console.error("❌ Error fetching booking:", err);
        res.status(500).json({ error: "Error fetching booking." });
    }
}

// Create a new booking
const createBooking = async (req, res) => {
    const { customerName, plateNumber, service } = req.body;
    try {
    const booking = await Booking.create({ customerName, plateNumber, service });
    console.log("✅ Booking created:", booking);
    res.status(200).json(booking);
    }
    catch (err) {
        console.error("❌ Error creating booking:", err);
        res.status(500).json({ error: "Error creating booking." });
    }  
}

// Delete a booking
const deleteBooking = async (req, res) => {
    const { id } = req.params;
    try {
        const booking = await Booking.findByIdAndDelete(id);
        if (!booking) {
            return res.status(404).json({ error: "Booking not found." });
        }
        res.status(200).json(booking);
    }
    catch (err) {
        console.error("❌ Error deleting booking:", err);
        res.status(500).json({ error: "Error deleting booking." });
    }
}

// Update a booking
const updateBooking = async (req, res) => {
    const { id } = req.params;
    const { customerName, plateNumber, service } = req.body;
    try {
        const booking = await Booking.findByIdAndUpdate(id, { ...req.body }, { new: true });
        if (!booking) {
            return res.status(404).json({ error: "Booking not found." });
        }
        res.status(200).json(booking);
    }
    catch (err) {
        console.error("❌ Error updating booking:", err);
        res.status(500).json({ error: "Error updating booking." });
    }
}

module.exports = {
    getBookings,
    getBooking,
    createBooking,
    deleteBooking,
    updateBooking
};
