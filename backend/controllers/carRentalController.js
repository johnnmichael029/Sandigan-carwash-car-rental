const CarRental = require('../models/carRentalModel');
const RentalFleet = require('../models/rentalFleetModel');
const Notification = require('../models/notificationModel');
const Customer = require('../models/customerModel');
const { sendPushNotification } = require('../utils/pushNotification');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const Promotion = require('../models/promotionModel');


const secretKey = process.env.RECAPTCHA_SECRET_KEY || "6LeOuJAsAAAAAJ1-8WXXOa0wA-a7UjO5qTzP8C5o";

// Auto-generate a Rental ID like 41026-946-001 (MDYY-HHmm-XXX)
const generateRentalId = async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const year = now.getFullYear().toString().slice(-2);
    const hour = now.getHours();
    const minute = now.getMinutes().toString().padStart(2, '0');

    // MDYY-HHmm-
    const prefix = `${month}${day}${year}-${hour}${minute}-`;

    // Find the last record with this minute-based prefix to increment sequence
    const last = await CarRental.findOne({ rentalId: { $regex: `^${prefix}` } })
        .sort({ createdAt: -1 })
        .lean();

    let seq = 1;
    if (last) {
        const parts = last.rentalId.split('-');
        seq = parseInt(parts[parts.length - 1], 10) + 1;
    }

    return `${prefix}${String(seq).padStart(3, '0')}`;
};

// POST /api/car-rentals — PUBLIC (guest submission)
const createRental = async (req, res) => {
    const {
        fullName, contactNumber, emailAddress, address,
        vehicleId, rentalStartDate, returnDate, destination, notes,
        requirementsAcknowledged, captchaToken,
        promoCode, promoDiscount, estimatedPrice // From mobile
    } = req.body;

    // --- Validation ---
    if (!fullName || !contactNumber || !emailAddress || !address ||
        !vehicleId || !rentalStartDate || !returnDate || !destination) {
        return res.status(400).json({ error: 'All required fields must be filled.' });
    }

    if (!requirementsAcknowledged) {
        return res.status(400).json({ error: 'Customer must acknowledge the requirements.' });
    }

    try {
        // Skip captcha for internal staff (check for valid session cookie)
        // Also skip for mobile app users authenticated via Bearer JWT token
        let skipCaptcha = false;
        const token = req.cookies?.token;
        const bearerToken = req.headers.authorization?.startsWith('Bearer ') 
            ? req.headers.authorization.split(' ')[1] 
            : null;
        
        if (token) {
            try {
                jwt.verify(token, process.env.JWT_SECRET);
                skipCaptcha = true;
            } catch (err) { /* Invalid token — force captcha check */ }
        }
        // Mobile app uses stateless Bearer JWT — bypass captcha
        if (bearerToken) {
            try {
                jwt.verify(bearerToken, process.env.JWT_SECRET);
                skipCaptcha = true;
            } catch (err) { /* Invalid token — force captcha check */ }
        }

        if (!skipCaptcha) {
            if (!captchaToken) {
                return res.status(400).json({ error: "Please solve the security captcha first." });
            }
            const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;
            const response = await axios.post(verificationUrl);
            if (!response.data.success) {
                return res.status(400).json({
                    error: "Captcha verification failed. Please try again.",
                    details: response.data['error-codes']
                });
            }
        }
        // Fetch vehicle info
        const vehicle = await RentalFleet.findById(vehicleId);
        if (!vehicle) return res.status(404).json({ error: 'Selected vehicle not found.' });
        if (!vehicle.isAvailable) return res.status(400).json({ error: 'This vehicle is currently not available.' });

        // Compute days and total
        const start = new Date(rentalStartDate);
        const end = new Date(returnDate);
        const diffMs = end - start;
        const rentalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        
        // Use estimatedPrice if provided (mobile), else calculate
        const estimatedTotal = estimatedPrice !== undefined ? estimatedPrice : (rentalDays * vehicle.pricePerDay);

        const rentalId = await generateRentalId();

        const rental = await CarRental.create({
            rentalId,
            fullName: fullName.trim(),
            contactNumber: contactNumber.trim(),
            emailAddress: emailAddress.trim(),
            address: address.trim(),
            vehicleId: vehicle._id,
            vehicleName: vehicle.vehicleName,
            pricePerDay: vehicle.pricePerDay,
            rentalStartDate: start,
            returnDate: end,
            rentalDays,
            estimatedTotal,
            destination: destination.trim(),
            notes: notes?.trim() || '',
            requirementsAcknowledged: true,
            status: 'Pending',
            statusLogs: [{ status: 'Pending' }],
            promoCode: promoCode || null,
            promoDiscount: promoDiscount || 0
        });

        // Consuming Promotion Usage (One-time per customer)
        if (promoCode) {
            try {
                const authHeader = req.headers.authorization;
                let customerId = null;
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    const token = authHeader.split(' ')[1];
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    customerId = decoded._id;
                }

                if (customerId) {
                    await Promotion.findOneAndUpdate(
                        { code: promoCode.trim().toUpperCase() },
                        { 
                            $addToSet: { usedBy: customerId },
                            $inc: { usageCount: 1 }
                        }
                    );
                } else {
                    await Promotion.findOneAndUpdate(
                        { code: promoCode.trim().toUpperCase() },
                        { $inc: { usageCount: 1 } }
                    );
                }
            } catch (err) {
                console.error("Promotion usage update failed:", err.message);
            }
        }

        // Auto-create employee notification
        await Notification.create({
            message: `New car rental request from ${fullName} for ${vehicle.vehicleName} (${rentalId})`,
            type: 'rental',
            isRead: false
        });

        // Emit real-time notification via Socket.io if available
        try {
            const io = req.app.get('io');
            if (io) {
                io.emit('new_notification', { type: 'rental', message: `New rental: ${rentalId}` });
                io.emit('new_rental', rental); // Explicit event for the rental dashboard
            }
        } catch (_) { /* non-critical */ }

        res.status(201).json({ success: true, rentalId, rental });
    } catch (err) {
        console.error('[CAR_RENTAL_CREATE]', err);
        res.status(500).json({ error: err.message || 'Failed to submit rental request.' });
    }
};

// GET /api/car-rentals — EMPLOYEE/ADMIN
const getRentals = async (req, res) => {
    try {
        const { status, search } = req.query;
        const filter = {};

        if (status && status !== 'All') filter.status = status;
        if (req.query.promoOnly === 'true') filter.promoCode = { $ne: null };

        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [
                { rentalId: regex },
                { fullName: regex },
                { vehicleName: regex },
                { destination: regex }
            ];
        }

        const rentals = await CarRental.find(filter)
            .sort({ createdAt: -1 })
            .populate('handledBy', 'firstName lastName')
            .lean();

        res.json(rentals);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch rentals.' });
    }
};

// GET /api/car-rentals/:id — EMPLOYEE/ADMIN
const getRental = async (req, res) => {
    try {
        const rental = await CarRental.findById(req.params.id)
            .populate('handledBy', 'firstName lastName')
            .lean();
        if (!rental) return res.status(404).json({ error: 'Rental not found.' });
        res.json(rental);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch rental.' });
    }
};

// PATCH /api/car-rentals/:id/status — EMPLOYEE/ADMIN
const updateStatus = async (req, res) => {
    const { status, note, cancellationReason } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'Active', 'Returned', 'Cancelled'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value.' });
    }

    try {
        const rental = await CarRental.findById(req.params.id);
        if (!rental) return res.status(404).json({ error: 'Rental not found.' });

        rental.status = status;
        rental.statusLogs.push({ status, note: note || '', timestamp: new Date() });
        rental.handledBy = req.employee?._id || null;

        if (status === 'Cancelled' && cancellationReason) {
            rental.cancellationReason = cancellationReason;
        }

        await rental.save();

        // Automatic Vehicle Availability Management & Revenue Generation
        try {
            const io = req.app.get('io');
            if (status === 'Confirmed' || status === 'Active') {
                // Mark vehicle as UNAVAILABLE
                await RentalFleet.findByIdAndUpdate(rental.vehicleId, { isAvailable: false }, { returnDocument: 'after', runValidators: true });
                if (io) io.emit('fleet_updated');

                if (status === 'Active') {
                    // Generate Revenue Entry for Ledger
                    const Revenue = require('../models/revenueModel');
                    const existingRevenue = await Revenue.findOne({ referenceId: rental.rentalId });

                    if (!existingRevenue) {
                        await Revenue.create({
                            title: `Car Rental — ${rental.fullName}`,
                            amount: rental.estimatedTotal,
                            category: 'Rental',
                            source: 'Rental',
                            referenceId: rental.rentalId,
                            notes: `Vehicle: ${rental.vehicleName} | Days: ${rental.rentalDays}`
                        });
                        if (io) io.emit('revenue_updated'); // Trigger frontend finance refresh
                    }
                }

            } else if (status === 'Returned' || status === 'Cancelled') {
                // Mark vehicle as AVAILABLE again
                await RentalFleet.findByIdAndUpdate(rental.vehicleId, { isAvailable: true }, { returnDocument: 'after', runValidators: true });
                if (io) io.emit('fleet_updated');
            }
            if (io) io.emit('update_rental', rental);

            // ── Push Notification to Customer ──
            try {
                const customer = await Customer.findOne({ email: rental.emailAddress });
                if (customer?.pushToken) {
                    const msgMap = {
                        'Confirmed': { title: '📋 Rental Confirmed!', body: `Your rental for ${rental.vehicleName} has been confirmed.` },
                        'Active':    { title: '🔑 Rental is now Active!', body: `Enjoy your ${rental.vehicleName}. Drive safe!` },
                        'Returned':  { title: '✅ Rental Completed!', body: `Thank you for returning ${rental.vehicleName}. See you again!` },
                        'Cancelled': { title: '❌ Rental Cancelled', body: `Your rental for ${rental.vehicleName} was cancelled.` },
                    };
                    const msg = msgMap[status];
                    if (msg) await sendPushNotification(customer.pushToken, msg.title, msg.body, { rentalId: rental._id });
                }
            } catch (pushErr) { console.warn('[Push] rental update:', pushErr.message); }

        } catch (fleetErr) {
            console.error('[STATUS_SYNC_FLEET_ERR]', fleetErr);
        }

        res.json(rental);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update status.' });
    }
};


const updateRental = async (req, res) => {
    const { id } = req.params;
    const { fullName, contactNumber, emailAddress, address, rentalStartDate, returnDate, destination, notes } = req.body;

    try {
        const rental = await CarRental.findById(id);
        if (!rental) return res.status(404).json({ error: 'Rental not found.' });

        if (fullName) rental.fullName = fullName;
        if (contactNumber) rental.contactNumber = contactNumber;
        if (emailAddress) rental.emailAddress = emailAddress;
        if (address) rental.address = address;
        if (destination) rental.destination = destination;
        if (notes !== undefined) rental.notes = notes;

        // Schedule Update & Recalculation
        if (rentalStartDate || returnDate) {
            if (rentalStartDate) rental.rentalStartDate = new Date(rentalStartDate);
            if (returnDate) rental.returnDate = new Date(returnDate);

            // Recalculate duration and total
            const diff = new Date(rental.returnDate) - new Date(rental.rentalStartDate);
            rental.rentalDays = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));

            const vehicle = await RentalFleet.findById(rental.vehicleId);
            if (vehicle) {
                rental.estimatedTotal = rental.rentalDays * vehicle.pricePerDay;
            }
        }

        await rental.save();
        res.json(rental);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update rental details.' });
    }
};

const cancelRental = async (req, res) => {
    try {
        const id = req.params.id;
        const rental = await CarRental.findById(id);

        if (!rental) return res.status(404).json({ error: 'Rental not found.' });

        // Security
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const customer = await Customer.findById(decoded._id);
            if (customer && customer.email !== rental.emailAddress) {
                return res.status(403).json({ error: 'Unauthorized to cancel this rental.' });
            }
        }

        if (rental.status !== 'Pending') {
            return res.status(400).json({ error: `Cannot cancel rental with status: ${rental.status}` });
        }

        // 1. Update status
        rental.status = 'Cancelled';
        rental.statusLogs.push({ status: 'Cancelled', note: 'Cancelled by customer', timestamp: new Date() });
        await rental.save();

        // 2. Return Voucher
        if (rental.promoCode) {
            const customer = await Customer.findOne({ email: rental.emailAddress });
            if (customer) {
                await Promotion.findOneAndUpdate(
                    { code: rental.promoCode.trim().toUpperCase() },
                    { 
                        $pull: { usedBy: customer._id },
                        $inc: { usageCount: -1 }
                    }
                );
            } else {
                await Promotion.findOneAndUpdate(
                    { code: rental.promoCode.trim().toUpperCase() },
                    { $inc: { usageCount: -1 } }
                );
            }
        }

        const io = req.app.get('io');
        if (io) io.emit('update_rental', rental);

        res.json({ success: true, message: 'Rental cancelled successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { createRental, getRentals, getRental, updateStatus, updateRental, cancelRental };
