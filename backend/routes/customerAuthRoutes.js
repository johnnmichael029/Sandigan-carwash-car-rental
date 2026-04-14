const express = require('express');
const router = express.Router();
const Customer = require('../models/customerModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');

// Generate JWT for Customer
const createToken = (_id) => {
    return jwt.sign({ _id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @route   POST /api/customer-auth/register
// @desc    Register a new customer from the mobile app
router.post('/register', async (req, res) => {
    const { firstName, lastName, email, phone, password } = req.body;

    try {
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: 'All fields must be filled.' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Hash password first
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Check if a customer already exists with this email
        const existing = await Customer.findOne({ email: normalizedEmail });

        if (existing) {
            // Case 1: Already a mobile app user (has password) — block duplicate
            if (existing.password) {
                return res.status(400).json({ error: 'An account with this email already exists.' });
            }
            
            // Case 2: Exists as a CRM-only profile (no password) — UPGRADE it to a mobile app account
            existing.password = hash;
            existing.phone = phone || existing.phone;
            // Add 'Mobile App' tag if not already present
            const tagSet = new Set(existing.tags || ['New Customer']);
            tagSet.add('Mobile App');
            existing.tags = Array.from(tagSet);
            await existing.save();

            const token = createToken(existing._id);

            // 🔴 Real-time: Notify admin dashboard
            const io = req.app.get('io');
            if (io) io.emit('new_mobile_customer', {
                _id: existing._id, firstName: existing.firstName, lastName: existing.lastName,
                email: existing.email, createdAt: existing.createdAt, tags: existing.tags
            });

            return res.status(201).json({
                email: existing.email,
                token,
                firstName: existing.firstName,
                lastName: existing.lastName,
                _id: existing._id
            });
        }

        // Case 3: Brand new customer — create fresh record
        const customer = await Customer.create({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: normalizedEmail,
            phone: phone || '00000000000',
            password: hash,
            tags: ['New Customer', 'Mobile App']  // Auto-tagged for CRM visibility
        });

        // 🔴 Real-time: Notify admin dashboard immediately
        const io = req.app.get('io');
        if (io) io.emit('new_mobile_customer', {
            _id: customer._id, firstName: customer.firstName, lastName: customer.lastName,
            email: customer.email, phone: customer.phone,
            createdAt: customer.createdAt, tags: customer.tags, bookingCount: 0
        });

        const token = createToken(customer._id);

        res.status(201).json({ email: customer.email, token, firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone || '', _id: customer._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/customer-auth/login
// @desc    Authenticate customer and get token
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ error: 'Please submit both email and password.' });
        }

        const customer = await Customer.findOne({ email });
        if (!customer) {
            return res.status(401).json({ error: 'Invalid login credentials.' });
        }

        if (!customer.password) {
             return res.status(401).json({ error: 'This account was created without a password. Please contact support.' });
        }

        const isMatch = await bcrypt.compare(password, customer.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid login credentials.' });
        }

        const token = createToken(customer._id);

        res.status(200).json({ email, token, firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone || '', _id: customer._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/customer-auth/me
// @desc    Get current logged in customer profile
// @access  Private (Customer Token Required)
router.get('/me', requireCustomerAuth, async (req, res) => {
    try {
        res.status(200).json(req.customer);
    } catch (err) {
        res.status(500).json({ error: 'Server error fetching user details.' });
    }
});

// @route   GET /api/customer-auth/my-bookings
// @desc    Paginated car wash bookings for the logged-in customer
// @access  Private (Customer Token Required)
router.get('/my-bookings', requireCustomerAuth, async (req, res) => {
    try {
        const Booking = require('../models/bookingModel');
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 15);
        const skip  = (page - 1) * limit;

        const [bookings, total] = await Promise.all([
            Booking.find({ emailAddress: req.customer.email })
                .sort({ createdAt: -1 })
                .skip(skip).limit(limit).lean(),
            Booking.countDocuments({ emailAddress: req.customer.email })
        ]);

        res.status(200).json({
            bookings,
            page,
            limit,
            total,
            hasMore: skip + bookings.length < total
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error fetching your bookings.' });
    }
});


// @route   GET /api/customer-auth/my-rentals
// @desc    Paginated car rental history for the logged-in customer
// @access  Private (Customer Token Required)
router.get('/my-rentals', requireCustomerAuth, async (req, res) => {
    try {
        const CarRental = require('../models/carRentalModel');
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 15);
        const skip  = (page - 1) * limit;

        const [rentals, total] = await Promise.all([
            CarRental.find({ emailAddress: req.customer.email })
                .sort({ createdAt: -1 })
                .skip(skip).limit(limit).lean(),
            CarRental.countDocuments({ emailAddress: req.customer.email })
        ]);

        res.status(200).json({
            rentals,
            page,
            limit,
            total,
            hasMore: skip + rentals.length < total
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error fetching your rentals.' });
    }
});


// @route   GET /api/customer-auth/all
// @desc    Get all registered app customers with booking counts (Admin only)
// @access  Protected (Admin JWT via Authorization header)
router.get('/all', async (req, res) => {
    try {
        const Booking = require('../models/bookingModel');
        const CarRental = require('../models/carRentalModel');

        // Filter by 'Mobile App' tag — reliably tagged on every mobile registration
        const customers = await Customer.find({ tags: 'Mobile App' })
            .select('-password')
            .sort({ createdAt: -1 })
            .lean();

        // Attach booking count for each customer
        // Car wash: all statuses count (booked = intent)
        // Car rental: only 'Active' counts (payment confirmed)
        const enriched = await Promise.all(customers.map(async (c) => {
            const washCount = await Booking.countDocuments({
                $or: [{ emailAddress: c.email }, { customerId: c._id }]
            });
            const rentalCount = await CarRental.countDocuments({
                emailAddress: c.email,
                status: 'Active'
            });
            return { ...c, bookingCount: washCount + rentalCount };
        }));

        res.status(200).json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/customer-auth/:id/bookings
// @desc    Get all bookings for a specific registered customer (Admin only)
// @access  Protected (Admin JWT via Authorization header)
router.get('/:id/bookings', async (req, res) => {
    try {
        const Booking = require('../models/bookingModel');
        const CarRental = require('../models/carRentalModel');

        const customer = await Customer.findById(req.params.id).select('-password').lean();
        if (!customer) return res.status(404).json({ error: 'Customer not found.' });

        const [bookings, rentals] = await Promise.all([
            Booking.find({
                $or: [{ emailAddress: customer.email }, { customerId: customer._id }]
            }).sort({ createdAt: -1 }).lean(),
            // Include ALL rental statuses so new bookings appear immediately in history
            CarRental.find({ emailAddress: customer.email })
                .sort({ createdAt: -1 }).lean()

        ]);

        // Tag type so the frontend can distinguish them
        const tagged = [
            ...bookings.map(b => ({ ...b, _type: 'wash' })),
            ...rentals.map(r => ({ ...r, _type: 'rental' }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json({ customer, bookings: tagged });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
