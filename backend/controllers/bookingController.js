const Booking = require('../models/bookingModel');
const Notification = require('../models/notificationModel');
const { calculateTotalFromDb } = require('./pricingController');
const { createLog } = require('./activityLogController');

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
    const { captchaToken, firstName, lastName, phoneNumber, emailAddress, vehicleType, serviceType, bookingTime } = req.body;
    try {
        // Skip captcha for internal staff (check for valid session cookie)
        const jwt = require('jsonwebtoken');
        let skipCaptcha = false;
        const token = req.cookies?.token;
        if (token) {
            try {
                jwt.verify(token, process.env.JWT_SECRET);
                skipCaptcha = true;
            } catch (err) { /* Invalid token — force captcha check */ }
        }

        if (!skipCaptcha) {
            if (!captchaToken) {
                return res.status(400).json({ error: "Captcha token is required for public bookings." });
            }
            const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;
            const response = await axios.post(verificationUrl);
            if (!response.data.success) {
                return res.status(400).json({
                    error: "Captcha verification failed.",
                    details: response.data['error-codes']
                });
            }
        }

        const formattedPhoneNumber = `0${phoneNumber}`; // Prepend 0 if phone number exists, else set to null
        // Generate the Batch ID before saving
        const generatedBatchID = await generateBatchID(bookingTime);
        const totalPrice = await calculateTotalFromDb(vehicleType, serviceType);
        const booking = await Booking.create({
            firstName,
            lastName,
            phoneNumber: formattedPhoneNumber,
            emailAddress,
            vehicleType,
            serviceType,
            bookingTime,
            batchId: generatedBatchID,
            totalPrice
        });

        // Create a notification for this booking
        const serviceName = Array.isArray(serviceType) ? serviceType.join(', ') : serviceType;
        const notif = await Notification.create({
            message: `New booking: ${firstName} ${lastName} (${serviceName})`,
            type: 'new_booking',
            bookingId: booking._id
        });

        // Resolve actor from JWT (staff) or mark as public
        let actorName = 'Public Customer';
        let actorId = null;
        let actorRole = 'public';
        const jwtForLog = require('jsonwebtoken');
        const tokenForLog = req.cookies?.token;
        if (tokenForLog) {
            try {
                const decoded = jwtForLog.verify(tokenForLog, process.env.JWT_SECRET);
                actorId = decoded.id;
                actorRole = decoded.role || 'employee';
                // Fetch name
                const Employee = require('../models/employeeModel');
                const emp = await Employee.findById(decoded.id).lean();
                if (emp) actorName = emp.fullName;
            } catch (_) { /* public booking */ }
        }

        // Log the activity
        const log = await createLog({
            actorId,
            actorName,
            actorRole,
            action: 'booking_created',
            message: `${actorName} created a booking for ${firstName} ${lastName} (${serviceName})`,
            bookingId: booking._id,
            meta: { customer: `${firstName} ${lastName}`, services: serviceName }
        });

        // Emit socket events
        const io = req.app.get('io');
        if (io) {
            io.emit('new_notification', notif);
            io.emit('new_booking', booking);
            if (log) io.emit('new_activity_log', log);
        }

        console.log("✅ Booking created:", booking.batchId);
        res.status(201).json(booking);
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

        // Resolve actor
        let actorName = 'Unknown Staff';
        let actorId = null;
        let actorRole = 'employee';
        const jwt = require('jsonwebtoken');
        const token = req.cookies?.token;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                actorId = decoded.id;
                actorRole = decoded.role;
                const Employee = require('../models/employeeModel');
                const emp = await Employee.findById(decoded.id).lean();
                if (emp) actorName = emp.fullName;
            } catch (_) { }
        }

        await createLog({
            actorId, actorName, actorRole,
            action: 'booking_deleted',
            message: `${actorName} deleted booking for ${booking.firstName} ${booking.lastName}`,
            bookingId: booking._id,
            meta: { customer: `${booking.firstName} ${booking.lastName}` }
        });

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
    try {
        // Find existing to know if we need to log a status change
        const currentBooking = await Booking.findById(id);
        if (!currentBooking) {
            return res.status(404).json({ error: "Booking not found." });
        }

        const updateQuery = { $set: { ...req.body } };

        // If status changed, push to logs
        if (req.body.status && req.body.status !== currentBooking.status) {
            updateQuery.$push = { statusLogs: { status: req.body.status, timestamp: new Date() } };
        }

        // If bookingTime changed, regenerate a fresh batchId to prevent duplicate sequences
        if (req.body.bookingTime && req.body.bookingTime !== currentBooking.bookingTime) {
            try {
                const newBatchId = await generateBatchID(req.body.bookingTime);
                updateQuery.$set.batchId = newBatchId;
            } catch (slotError) {
                // The new time slot is full – reject the edit
                return res.status(400).json({ error: slotError.message });
            }
        }

        // If vehicle or services changed, recalculate total price
        const newVehicle = req.body.vehicleType || currentBooking.vehicleType;
        const newServices = req.body.serviceType || currentBooking.serviceType;
        if (req.body.vehicleType || req.body.serviceType) {
            updateQuery.$set.totalPrice = await calculateTotalFromDb(newVehicle, newServices);
        }

        // --- ERP Phase 2: Handle Detailer Commission ---
        const finalStatus = req.body.status || currentBooking.status;
        const priceChanged = !!(req.body.vehicleType || req.body.serviceType);
        const statusJustCompleted = (req.body.status === 'Completed' && currentBooking.status !== 'Completed');

        if (finalStatus === 'Completed' && (statusJustCompleted || priceChanged)) {
            const finalPrice = updateQuery.$set.totalPrice || currentBooking.totalPrice;
            
            // Fetch current commission rate from settings (default to 0.30 if not set)
            const { getSettingValue } = require('./settingController');
            const commissionRate = await getSettingValue('commission_rate', 0.30);

            updateQuery.$set.commission = finalPrice * commissionRate;
            if (statusJustCompleted) updateQuery.$set.commissionStatus = 'Unpaid';

            // ERP Phase 3: Auto-deduct inventory stock & record supply cost as expense
            if (statusJustCompleted) {
                try {
                    const { deductStockForBooking } = require('./serviceRecipeController');
                    const serviceTypes = Array.isArray(currentBooking.serviceType)
                        ? currentBooking.serviceType
                        : [currentBooking.serviceType].filter(Boolean);

                    const supplyCost = await deductStockForBooking({
                        serviceTypes,
                        vehicleType: newVehicle,
                    });

                    if (supplyCost > 0) {
                        const Expense = require('../models/expenseModel');
                        const shortId = currentBooking.batchId || id.toString().slice(-6);
                        await Expense.create({
                            title: `Supplies used — Booking #${shortId}`,
                            category: 'Supplies',
                            amount: supplyCost,
                            description: `Auto-deducted per service recipe for ${serviceTypes.join(', ')} (${newVehicle})`,
                        });
                    }
                } catch (recipeErr) {
                    // Non-fatal: log the error but don't block the booking update
                    console.error('[Recipe] Failed to deduct stock:', recipeErr.message);
                }
            }
        }

        const booking = await Booking.findByIdAndUpdate(id, updateQuery, { returnDocument: 'after' });

        // Resolve actor from JWT
        let actorName = 'Unknown Staff';
        let actorId = null;
        let actorRole = 'employee';
        const jwt = require('jsonwebtoken');
        const token = req.cookies?.token;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                actorId = decoded.id;
                actorRole = decoded.role;
                const Employee = require('../models/employeeModel');
                const emp = await Employee.findById(decoded.id).lean();
                if (emp) actorName = emp.fullName;
            } catch (_) { }
        }

        // Log status change vs generic update
        if (req.body.status && req.body.status !== currentBooking.status) {
            const log = await createLog({
                actorId, actorName, actorRole,
                action: 'booking_status_changed',
                message: `${actorName} changed booking #${booking.batchId} status from ${currentBooking.status} → ${req.body.status}`,
                bookingId: booking._id,
                meta: { fromStatus: currentBooking.status, toStatus: req.body.status, customer: `${booking.firstName} ${booking.lastName}` }
            });
            const io = req.app.get('io');
            if (io) {
                io.emit('update_booking', booking);
                if (log) io.emit('new_activity_log', log);
            }
        } else {
            const log = await createLog({
                actorId, actorName, actorRole,
                action: 'booking_updated',
                message: `${actorName} updated booking details for ${booking.firstName} ${booking.lastName}`,
                bookingId: booking._id,
                meta: { customer: `${booking.firstName} ${booking.lastName}` }
            });
            const io = req.app.get('io');
            if (io) {
                io.emit('update_booking', booking);
                if (log) io.emit('new_activity_log', log);
            }
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

    // 2. Count how many non-cancelled bookings exist for this specific hour today
    const existingCount = await Booking.countDocuments({
        bookingTime: requestedHour,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: 'Cancelled' } // Don't count Cancelled slots against capacity
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

        // Group non-cancelled bookings by their 'bookingTime' for today
        const bookings = await Booking.aggregate([
            { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay }, status: { $ne: 'Cancelled' } } },
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
