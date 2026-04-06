const Booking = require('../models/bookingModel');
const Notification = require('../models/notificationModel');
const { calculateTotalFromDb } = require('./pricingController');
const { createLog } = require('./activityLogController');

const secretKey = process.env.RECAPTCHA_SECRET_KEY; // Use variable, not the raw key!
const axios = require('axios');
const jwt = require('jsonwebtoken');
const Promotion = require('../models/promotionModel');
const Customer = require('../models/customerModel');
const Employee = require('../models/employeeModel');

// Get all bookings
const getBookings = async (req, res) => {
    try {
        let filter = {};
        if (req.query.smcOnly === 'true') filter.smcId = { $ne: null };
        if (req.query.promoOnly === 'true') filter.promoCode = { $ne: null };

        const search = req.query.search || '';
        if (search && search.trim()) {
            const lowTerm = search.trim();
            const searchRegex = { $regex: lowTerm, $options: 'i' };

            filter = {
                ...filter,
                $or: [
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                    { serviceType: searchRegex },
                    { smcId: searchRegex },
                    { promoCode: searchRegex },
                    { batchId: searchRegex },
                    {
                        $expr: {
                            $regexMatch: {
                                input: { $dateToString: { format: "%m/%d/%Y", date: "$createdAt", timezone: "Asia/Manila" } },
                                regex: lowTerm,
                                options: "i"
                            }
                        }
                    }
                ]
            };
        }

        const bookings = await Booking.find(filter).sort({ createdAt: -1 }).limit(200);
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
    const { firstName, lastName, phoneNumber, emailAddress, vehicleType, serviceType, bookingTime, captchaToken, promoCode, promoDiscount } = req.body;

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

        const formattedPhoneNumber = `0${phoneNumber}`; // Prepend 0 if phone number exists, else set to null
        // Generate the Batch ID before saving
        const generatedBatchID = await generateBatchID(bookingTime);
        const basePrice = await calculateTotalFromDb(vehicleType, serviceType);
        const discountAmount = req.body.discountAmount || 0;
        const promoDiscountVal = promoDiscount || 0;

        // Compute retail total from purchasedProducts, if any
        const purchasedProducts = Array.isArray(req.body.purchasedProducts) ? req.body.purchasedProducts : [];
        const retailTotal = purchasedProducts.reduce((sum, p) => sum + (Number(p.price) * Number(p.quantity)), 0);

        const totalPrice = Math.max(0, basePrice + retailTotal - discountAmount - promoDiscountVal);

        const booking = await Booking.create({
            firstName,
            lastName,
            phoneNumber: formattedPhoneNumber,
            emailAddress,
            vehicleType,
            serviceType,
            bookingTime,
            batchId: generatedBatchID,
            totalPrice,
            smcId: req.body.smcId || null,
            discountAmount,
            promoCode: promoCode || null,
            promoDiscount: promoDiscountVal,
            purchasedProducts,
            assignedTo: req.body.assignedTo || null,
            detailer: req.body.detailer || null
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
        const tokenForLog = req.cookies?.token;
        if (tokenForLog) {
            try {
                const decoded = jwt.verify(tokenForLog, process.env.JWT_SECRET);
                actorId = decoded.id;
                actorRole = decoded.role || 'employee';
                // Fetch name
                const emp = await Employee.findById(decoded.id).lean();
                if (emp) actorName = emp.fullName;
            } catch (_) { /* public booking */ }
        }

        // Log the activity
        const log = await createLog({
            actorId,
            actorName,
            actorRole,
            module: 'BOOKING',
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
        const token = req.cookies?.token;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                actorId = decoded.id;
                actorRole = decoded.role;
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

        // If vehicle, services, or SMC changed, recalculate total price
        const newVehicle = req.body.vehicleType || currentBooking.vehicleType;
        const newServices = req.body.serviceType || currentBooking.serviceType;

        const newPurchasedProducts = req.body.purchasedProducts !== undefined ? req.body.purchasedProducts : (currentBooking.purchasedProducts || []);
        let retailTotal = 0;
        if (newPurchasedProducts.length > 0) {
            newPurchasedProducts.forEach(p => {
                // Parse correctly just in case
                retailTotal += (Number(p.price) * Number(p.quantity));
            });
            updateQuery.$set.purchasedProducts = newPurchasedProducts;
        }

        if (req.body.vehicleType || req.body.serviceType || req.body.discountAmount !== undefined || req.body.promoDiscount !== undefined || req.body.purchasedProducts !== undefined) {
            const basePrice = await calculateTotalFromDb(newVehicle, newServices);
            const smcDiscount = req.body.discountAmount !== undefined ? req.body.discountAmount : (currentBooking.discountAmount || 0);
            const promoDiscount = req.body.promoDiscount !== undefined ? req.body.promoDiscount : (currentBooking.promoDiscount || 0);

            updateQuery.$set.totalPrice = Math.max(0, basePrice + retailTotal - smcDiscount - promoDiscount);
            updateQuery.$set.discountAmount = smcDiscount;
            updateQuery.$set.promoDiscount = promoDiscount;

            if (req.body.smcId !== undefined) updateQuery.$set.smcId = req.body.smcId;
            if (req.body.promoCode !== undefined) updateQuery.$set.promoCode = req.body.promoCode;
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

            // Calculate commission only on the service portion (Total Price minus Products)
            const commissionablePrice = Math.max(0, finalPrice - retailTotal);
            updateQuery.$set.commission = commissionablePrice * commissionRate;
            if (statusJustCompleted) updateQuery.$set.commissionStatus = 'Unpaid';

            // ERP Phase 3+: On first completion — deduct inventory, record expenses, revenue, update CRM
            if (statusJustCompleted) {
                // Record Promo Usage in DB if code was used
                const usedPromo = req.body.promoCode || currentBooking.promoCode;
                if (usedPromo) {
                    const cust = await Customer.findOne({ email: currentBooking.emailAddress });
                    if (cust) {
                        await Promotion.findOneAndUpdate(
                            { code: usedPromo.toUpperCase().trim() },
                            { $inc: { usageCount: 1 }, $addToSet: { usedBy: cust._id } }
                        );
                    }
                }

                // Hoist serviceTypes so it's available in all sub-blocks below
                const serviceTypes = Array.isArray(currentBooking.serviceType)
                    ? currentBooking.serviceType
                    : [currentBooking.serviceType].filter(Boolean);

                // ── Auto-upsert CRM Customer Record & Capture SMC ID ──
                let finalSMCId = currentBooking.smcId;
                try {
                    const { upsertCustomerFromBooking } = require('./crmController');
                    const syncResult = await upsertCustomerFromBooking({
                        firstName: currentBooking.firstName,
                        lastName: currentBooking.lastName,
                        email: currentBooking.emailAddress,
                        phone: currentBooking.phoneNumber,
                        vehicleType: newVehicle,
                        totalPrice: updateQuery.$set.totalPrice ?? currentBooking.totalPrice,
                        completedAt: new Date(),
                        purchasedProducts: newPurchasedProducts,
                        smcId: currentBooking.smcId,
                    });

                    if (syncResult && syncResult.smcId) {
                        finalSMCId = syncResult.smcId;
                        updateQuery.$set.smcId = syncResult.smcId;
                    }
                    if (syncResult && syncResult.customerId) {
                        updateQuery.$set.customerId = syncResult.customerId;
                    }
                } catch (crmErr) {
                    console.error('[CRM] Failed to upsert customer from booking:', crmErr.message);
                }

                // Auto-deduct inventory stock & record supply cost as expense
                try {
                    const { deductStockForBooking, getIngredientsForBooking } = require('./serviceRecipeController');

                    const supplyCost = await deductStockForBooking({
                        serviceTypes,
                        vehicleType: newVehicle,
                    });

                    if (supplyCost > 0) {
                        const Expense = require('../models/expenseModel');
                        const shortId = currentBooking.batchId || id.toString().slice(-6);

                        const ingredientsUsed = await getIngredientsForBooking({
                            serviceTypes,
                            vehicleType: newVehicle
                        });

                        await Expense.create({
                            title: `Supplies used — Booking #${shortId}`,
                            category: 'Supplies',
                            amount: supplyCost,
                            description: `Auto-deducted per service recipe for ${serviceTypes.join(', ')} (${newVehicle})`,
                            ingredients: ingredientsUsed
                        });
                    }

                    // Retail Products: Inventory Deduction & Expense Logging & POS Sync
                    if (newPurchasedProducts && newPurchasedProducts.length > 0) {
                        const { deductStockForProduct } = require('./serviceRecipeController');
                        const { generateTransactionId } = require('./retailController');
                        const RetailSale = require('../models/retailSaleModel');
                        const Expense = require('../models/expenseModel');
                        const Customer = require('../models/customerModel');

                        const shortId = currentBooking.batchId || id.toString().slice(-6);

                        // Find customer for linking if possible
                        const customer = await Customer.findOne({ email: currentBooking.emailAddress });

                        for (const product of newPurchasedProducts) {
                            // 1. Deduct Stock
                            const { totalCost, category } = await deductStockForProduct(product, product.quantity);

                            // 2. Log COGS Expense
                            if (totalCost > 0) {
                                await Expense.create({
                                    title: `Retail COGS — ${product.productName} (x${product.quantity})`,
                                    category: category || 'Retail',
                                    amount: totalCost,
                                    description: `Cost of goods sold during Booking #${shortId}`
                                });
                            }

                            // 3. AUTO-SYNC: Create POS Transaction record
                            const txId = await generateTransactionId({ name: product.productName, category: category || 'Retail' });
                            const isSMC = product.productName?.toLowerCase().includes('smc');

                            await RetailSale.create({
                                transactionId: txId,
                                productId: product.productId || null,
                                productName: product.productName,
                                quantity: product.quantity,
                                totalPrice: (Number(product.price) * Number(product.quantity)),
                                paymentMethod: 'Cash', // Default for auto-sync
                                isSMCBuy: isSMC,
                                smcId: isSMC ? finalSMCId : null, // LINK THE SMC ID HERE!
                                customerId: customer?._id || null,
                                customerType: (currentBooking.emailAddress === 'walkin@example.com') ? 'Walk-in' : 'Regular'
                            });
                        }
                    }
                } catch (recipeErr) {
                    console.error('[Recipe/POS Sync] Failed to process retail:', recipeErr.message);
                }

                // Auto-record Revenue in Finance ERP
                try {
                    const { recordRevenue } = require('./revenueController');
                    const { resolveRevenueCategory } = require('./retailController');
                    const finalBookingPrice = updateQuery.$set.totalPrice ?? currentBooking.totalPrice;
                    const retailMeta = newPurchasedProducts.length > 0 ? ` + Retail (${newPurchasedProducts.map(p => p.productName).join(', ')})` : '';

                    // Decide the base category logic: If it contains products, it's a "Mixed" transaction, else it's a "Service"
                    let baseToResolve = (newPurchasedProducts && newPurchasedProducts.length > 0) ? "Mixed" : "Service";

                    const revCategory = await resolveRevenueCategory(baseToResolve);

                    await recordRevenue({
                        title: `Car Wash — ${currentBooking.firstName} ${currentBooking.lastName}`,
                        amount: finalBookingPrice,
                        category: revCategory,
                        source: 'Booking',
                        referenceId: currentBooking.batchId || id,
                        notes: `${serviceTypes.join(', ')} | ${newVehicle}${retailMeta}`,
                        recordedBy: null,
                    });
                } catch (revErr) {
                    console.error('[Revenue] Failed to auto-record booking revenue:', revErr.message);
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
                module: 'BOOKING',
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
                module: 'BOOKING',
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

    // 3. Current Date formatting for the ID (MMDDYY)
    const todayStr = new Date();
    const month = (todayStr.getMonth() + 1).toString();
    const day = todayStr.getDate().toString();
    const year = todayStr.getFullYear().toString().slice(-2);
    const dateFormatted = `${month}${day}${year}`;

    // 4. Format: DatePrefix-Hour-Sequence (e.g., 33026-10-01)
    const sequence = (existingCount + 1).toString().padStart(2, '0');
    return `${dateFormatted}-${requestedHour}${sequence}`;
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

// ── EMPLOYEE PERFORMANCE LOGS ──
const getEmployeeHistory = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch all COMPLETED bookings where this employee is assigned
        const bookings = await Booking.find({
            assignedTo: id,
            status: 'Completed'
        })
            .sort({ createdAt: -1 })
            .select('batchId firstName lastName vehicleType serviceType totalPrice commission purchasedProducts createdAt');

        const { getSettingValue } = require('./settingController');
        const commissionRate = await getSettingValue('commission_rate', 0.30);

        // 1. Total Completed
        const bookingCount = bookings.length;

        // 2. Total Revenue Generated (Gross Price)
        const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

        // 3. Total Earnings (Commission)
        // We use the same calculation as getPayrollSummary for consistency
        const totalEarnings = bookings.reduce((sum, b) => {
            const retailTotal = (b.purchasedProducts || []).reduce((s, p) => s + (Number(p.price || 0) * Number(p.quantity || 0)), 0);
            const commissionablePrice = Math.max(0, (b.totalPrice || 0) - retailTotal);
            return sum + (commissionablePrice * commissionRate);
        }, 0);

        // Map to frontend expectations
        const mappedHistory = bookings.map(b => {
             const retailTotal = (b.purchasedProducts || []).reduce((s, p) => s + (Number(p.price || 0) * Number(p.quantity || 0)), 0);
             const commissionablePrice = Math.max(0, (b.totalPrice || 0) - retailTotal);
             const currentComm = commissionablePrice * commissionRate;

             return {
                _id: b._id,
                createdAt: b.createdAt,
                bookingId: b.batchId || b._id.toString().slice(-6).toUpperCase(),
                customerName: `${b.firstName} ${b.lastName}`,
                vehicleType: b.vehicleType,
                commission: currentComm,
                price: b.totalPrice || 0,
                isAttendance: false
             };
        });

        res.status(200).json({
            summary: {
                bookingCount,
                totalRevenue,
                totalEarnings
            },
            history: mappedHistory
        });
    } catch (err) {
        console.error('Error fetching employee history:', err);
        res.status(500).json({ error: 'Failed to fetch employee history.' });
    }
};

module.exports = {
    getBookings,
    getBooking,
    createBooking,
    deleteBooking,
    updateBooking,
    getAvailableTimeSlots,
    getEmployeeHistory
};
