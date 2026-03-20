const moongose = require('mongoose');
const Booking = require('../models/workoutsModel');
const secretKey = process.env.RECAPTCHA_SECRET_KEY; // Use variable, not the raw key!
const axios = require('axios');

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
    const { captchaToken, firstName, lastName, emailAddress, vehicleType, serviceType, bookingTime } = req.body;
    try {
        const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;
        const response = await axios.post(verificationUrl);
        
        
        if (!response.data.success) {
            return res.status(400).json({ 
                error: "Captcha verification failed.",
                details: response.data['error-codes'] // This helps you debug!
            });
        }
        // Generate the Batch ID before saving
        const generatedBatchID = await generateBatchID(bookingTime);
        const booking = await Booking.create({ 
            firstName, 
            lastName, 
            emailAddress, 
            vehicleType, 
            serviceType,
            bookingTime,
            batchID: generatedBatchID
        });
    console.log("✅ Booking created:", booking.batchID);
    res.status(200).json(booking);
    }   
    catch (err) {
    console.error("❌ Error creating booking:", err.message);
    
    // Check if the error is our custom "Slot is full" message
    if (err.message.includes("slot is full")) {
        return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: "Server error. Please try again later." });
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
    const { firstName, lastName, emailAddress, vehicleType, serviceType } = req.body;
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

// Helper function to generate the ID (keep this at the top or in a separate utils file)
const generateBatchID = async (requestedHour) => {
    // 1. Get today's date (start and end of day) to count only today's batches
    const MAX_CAPACITY_PER_HOUR = 3; // Set your limit here
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 2. Count how many bookings exist for this specific hour today
    const existingCount = await Booking.countDocuments({
        bookingTime: requestedHour,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existingCount >= MAX_CAPACITY_PER_HOUR) {
            throw new Error(`The ${requestedHour}:00 slot is full. Please pick another time.`);
        }

    // 3. Format: Hour-Sequence (e.g., 10-01)
    const sequence = (existingCount + 1).toString().padStart(2, '0');
    return `${requestedHour}-${sequence}`;
};

const getAvailableTimeSlots = async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Group bookings by their 'bookingTime' for today
        const bookings = await Booking.aggregate([
            { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay } } },
            { $group: { _id: "$bookingTime", count: { $sum: 1 } } }
        ]);

        // Format: { "08": 1, "10": 3 } (where "10" is full)
        const availabilityMap = {};
        bookings.forEach(b => {
            availabilityMap[b._id] = b.count;
        });

        res.status(200).json(availabilityMap);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

module.exports = {
    getBookings,
    getBooking,
    createBooking,
    deleteBooking,
    updateBooking,
    getAvailableTimeSlots
};
