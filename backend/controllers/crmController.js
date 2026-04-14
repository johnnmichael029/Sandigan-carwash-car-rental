const mongoose = require('mongoose');
const Customer = require('../models/customerModel');
const Booking = require('../models/bookingModel');
const CarRental = require('../models/carRentalModel');
const CrmTag = require('../models/crmTagModel');
const Expense = require('../models/expenseModel');
const { createLog } = require('./activityLogController');

// --- SELF-HEALING: Clear legacy unique email index ---
mongoose.connection.once('connected', async () => {
    try {
        const collections = await mongoose.connection.db.listCollections({ name: 'customers' }).toArray();
        if (collections.length > 0) {
            // Drop legacy unique index if it exists to fix the common E11000 null constraint
            await Customer.collection.dropIndex('email_1');
            console.log('[CRM] Cleared legacy unique email index. Non-unique sparse index will be recreated.');
        }
    } catch (err) {
        // Index handles non-existence gracefully
    }
});
// -----------------------------------------------------

// --- INTERNAL HELPERS ---
const getResolvedSMCConfig = async () => {
    try {
        const Setting = require('../models/settingModel');
        const setting = await Setting.findOne({ key: 'smc_config' });
        const val = setting?.value || {};
        return {
            cardName: val.cardName || "Sandigan Membership Card",
            cardColor: val.cardColor || "#0f172a",
            validityMonths: val.validityMonths !== undefined ? parseInt(val.validityMonths) : 12,
            abbreviation: val.abbreviation || 'SMC',
            price: val.price || 500,
            renewalPrice: val.renewalPrice || 350, // Default renewal price
            discountPercentage: val.discountPercentage || 10
        };
    } catch (err) {
        console.error('[SMC-CONFIG] Error resolving config:', err.message);
        return { cardName: "Sandigan Membership Card", cardColor: "#0f172a", validityMonths: 12, abbreviation: 'SMC', price: 500, renewalPrice: 350, discountPercentage: 10 };
    }
};

// Default system tags — seeded automatically if the collection is empty
const DEFAULT_TAGS = [
    { name: 'New Customer', color: '#0ea5e9', textColor: '#fff', isSystem: true, description: 'First-time customer' },
    { name: 'Regular', color: '#10b981', textColor: '#fff', isSystem: true, description: 'Returning customer' },
    { name: 'VIP', color: '#f59e0b', textColor: '#1a1a1a', isSystem: true, description: 'High-value spender' },
    { name: 'Churn Risk', color: '#ef4444', textColor: '#fff', isSystem: true, description: 'Inactive 90+ days' },
    { name: 'Walk-in', color: '#64748b', textColor: '#fff', isSystem: true, description: 'System-protected public account' },
    { name: 'Corporate Fleet', color: '#8b5cf6', textColor: '#fff', isSystem: false, description: 'Business account' },
    { name: 'Frequent Visitor', color: '#06b6d4', textColor: '#fff', isSystem: false, description: 'Visits 10+ times' },
    { name: 'Blacklisted', color: '#1f2937', textColor: '#f9fafb', isSystem: false, description: 'Do not service' },
];

// -------------------------------------------------------------
// CRM MODULE: Aggregates client data & handles master profiles
// -------------------------------------------------------------

// 1. Fetch all Customers (Filtered/Sorted by Loyalty)
const getAllCustomers = async (req, res) => {
    try {
        // Evaluate dynamic tags based on the current date, e.g. "Inactive"
        const timeNow = new Date();
        const inactiveThreshold = new Date(timeNow.getTime() - (90 * 24 * 60 * 60 * 1000)); // 3 months ago

        const customers = await Customer.find().sort({ lifetimeSpend: -1 }); // Top spenders first

        // Auto-compute At-Risk tags dynamically before sending to front-end
        const enriched = customers.map(c => {
            const tags = new Set(c.tags || []);

            // Core Logic: Churn Risk if 3 months without a visit
            if (c.lastVisitDate < inactiveThreshold && c.totalVisits > 0) tags.add('Churn Risk');
            else tags.delete('Churn Risk');

            return { ...c._doc, activeTags: Array.from(tags) };
        });

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Fetch specific Customer stats + history
const getCustomerStats = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const currentSMC = customer.smcId && customer.smcId !== null ? customer.smcId : '---NONE---';

        // Get car wash booking history
        const bookings = await Booking.find({
            $or: [
                { customerId: customer._id },
                { smcId: currentSMC },
                {
                    $and: [
                        { emailAddress: customer.email },
                        { customerId: { $in: [null, customer._id] } },
                        { smcId: { $in: [null, (customer.smcId || null)] } }
                    ]
                }
            ]
        }).sort({ createdAt: -1 });

        // Get Active car rentals (Active = paid & confirmed)
        const rentals = customer.email
            ? await CarRental.find({ emailAddress: customer.email, status: 'Active' }).sort({ createdAt: -1 }).lean()
            : [];

        // Tag each entry with its type for the frontend to distinguish
        const washHistory = bookings.map(b => ({ ...b._doc, _type: 'wash' }));
        const rentalHistory = rentals.map(r => ({ ...r, _type: 'rental' }));

        // Merge and sort by date descending
        const history = [...washHistory, ...rentalHistory]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Recalculate lifetime spend including rentals
        const actualVisitCount = bookings.length + rentals.length; // visits = total combined records
        const washSpend = bookings.reduce((sum, b) => sum + (parseFloat(b.totalPrice) || 0), 0);
        const rentalSpend = rentals.reduce((sum, r) => sum + (parseFloat(r.estimatedTotal) || 0), 0);
        const actualSpend = washSpend + rentalSpend;

        if (actualVisitCount !== customer.totalVisits || Math.abs(actualSpend - (customer.lifetimeSpend || 0)) > 0.01) {
            customer.totalVisits = actualVisitCount;
            customer.lifetimeSpend = actualSpend;
            await customer.save();
        }

        res.json({ customer, history });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Update Customer — full profile edit (name, email, phone, vehicles, notes, tags)
const updateCustomerCRM = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, vehicles, notes, tags } = req.body;

        // If email is being changed, make sure no duplicate exists
        if (email) {
            const duplicate = await Customer.findOne({ email: email.toLowerCase().trim(), _id: { $ne: req.params.id } });
            if (duplicate) {
                return res.status(400).json({ error: 'Another client already uses that email.' });
            }
        }

        const updateFields = {};
        if (firstName !== undefined) updateFields.firstName = firstName;
        if (lastName !== undefined) updateFields.lastName = lastName;
        if (email !== undefined) updateFields.email = email.toLowerCase().trim();
        if (phone !== undefined) updateFields.phone = phone || '00000000000';
        if (vehicles !== undefined) updateFields.vehicles = vehicles;
        if (notes !== undefined) updateFields.notes = notes;
        if (tags !== undefined) updateFields.tags = tags;

        const updated = await Customer.findByIdAndUpdate(req.params.id, updateFields, { returnDocument: 'after', runValidators: true });
        if (!updated) return res.status(404).json({ error: 'Customer not found.' });

        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'CRM',
                action: 'customer_updated',
                message: `Updated profile for client: ${updated.firstName} ${updated.lastName}`,
                meta: { id: updated._id, email: updated.email }
            });
        }

        res.json(updated);
    } catch (err) {
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return res.status(400).json({ error: `Conflict: This ${field} is already registered to another client.` });
        }
        res.status(500).json({ error: 'Failed to update customer profile. Please try again later.' });
    }
};

// 5. Delete a Customer profile
const deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ error: 'Customer not found.' });

        await Customer.findByIdAndDelete(req.params.id);

        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'CRM',
                action: 'customer_deleted',
                message: `Deleted customer profile: ${customer.firstName} ${customer.lastName}`,
                meta: { id: customer._id, email: customer.email }
            });
        }

        res.json({ message: 'Client profile deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. Manually add a new CRM Client
const createCustomer = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, vehicles, notes } = req.body;

        // Ensure email isn't already taking
        const exists = await Customer.findOne({ email: email.toLowerCase().trim() });
        if (exists) {
            return res.status(400).json({ error: 'A client with this email already exists in the CRM.' });
        }

        const customer = await Customer.create({
            firstName,
            lastName,
            email: email.toLowerCase().trim(),
            phone: phone || '00000000000',
            vehicles: vehicles ? vehicles.split(',').map(v => v.trim()).filter(Boolean) : [],
            notes: notes || '',
            tags: ['New Customer']
        });

        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'CRM',
                action: 'customer_created',
                message: `Registered new client: ${customer.firstName} ${customer.lastName}`,
                meta: { id: customer._id, email: customer.email }
            });
        }

        res.status(201).json(customer);
    } catch (err) {
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return res.status(400).json({ error: `Verification Error: A customer with this ${field} already exists in your database.` });
        }
        res.status(500).json({ error: 'Could not create customer profile at this moment.' });
    }
};

// 4. Synchronization Engine: Convert Historical Bookings into Customers 
const syncBookingsToCRM = async (req, res) => {
    try {
        const bookings = await Booking.find({ status: 'Completed' });
        let added = 0;
        let updated = 0;

        for (const bk of bookings) {
            const email = bk.emailAddress?.toLowerCase().trim();
            if (!email) continue;

            const existing = await Customer.findOne({ email });

            if (!existing) {
                await Customer.create({
                    firstName: bk.firstName,
                    lastName: bk.lastName,
                    email: email,
                    phone: bk.phoneNumber || 'N/A',
                    totalVisits: 1,
                    lifetimeSpend: bk.totalPrice || 0,
                    lastVisitDate: bk.updatedAt || bk.createdAt,
                    vehicles: [bk.vehicleType],
                    tags: ['New Customer']
                });
                added++;
            } else {

                const allBks = await Booking.find({ emailAddress: { $regex: new RegExp('^' + email + '$', 'i') }, status: 'Completed' });
                const allRentals = await CarRental.find({ emailAddress: { $regex: new RegExp('^' + email + '$', 'i') } });
                
                const washSpend = allBks.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
                const rentalSpend = allRentals.reduce((sum, r) => sum + (r.estimatedTotal || 0), 0);
                const totalSpend = washSpend + rentalSpend;

                const vehiclesSet = new Set([
                    ...allBks.map(b => b.vehicleType),
                    ...allRentals.map(r => r.vehicleName)
                ].filter(Boolean));
                
                const latestDate = [...allBks, ...allRentals]
                    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
                    .pop()?.updatedAt || new Date();

                existing.totalVisits = allBks.length + allRentals.length;
                existing.lifetimeSpend = totalSpend;
                existing.lastVisitDate = latestDate;
                existing.vehicles = Array.from(vehiclesSet);


                if (existing.totalVisits > 1) {
                    existing.tags = existing.tags.filter(t => t !== 'New Customer');
                    if (!existing.tags.includes('Regular')) existing.tags.push('Regular');
                }

                await existing.save();
                updated++;
            }
        }
        res.json({ message: `CRM Sync Complete. Added ${added} new clients, synchronized ${updated} active profiles.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── TAG MANAGEMENT  ─────────────────────────────────────────────

// GET all tags (auto-seed defaults on first call)
const getAllTags = async (req, res) => {
    try {
        const count = await CrmTag.countDocuments();
        if (count === 0) {
            await CrmTag.insertMany(DEFAULT_TAGS);
        }
        const tags = await CrmTag.find().sort({ createdAt: 1 });
        res.json(tags);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST create a new custom tag
const createTag = async (req, res) => {
    try {
        const { name, color, textColor, description } = req.body;
        const exists = await CrmTag.findOne({ name: { $regex: new RegExp('^' + name.trim() + '$', 'i') } });
        if (exists) return res.status(400).json({ error: 'A tag with that name already exists.' });
        const tag = await CrmTag.create({ name: name.trim(), color: color || '#6b7280', textColor: textColor || '#ffffff', description: description || '' });
        res.status(201).json(tag);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT update a tag (name/color only, cannot change isSystem)
const updateTag = async (req, res) => {
    try {
        const { name, color, textColor, description } = req.body;
        const updated = await CrmTag.findByIdAndUpdate(
            req.params.tagId,
            { name: name?.trim(), color, textColor, description },
            { returnDocument: 'after', runValidators: true }
        );
        if (!updated) return res.status(404).json({ error: 'Tag not found.' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE a tag — system tags are protected
const deleteTag = async (req, res) => {
    try {
        const tag = await CrmTag.findById(req.params.tagId);
        if (!tag) return res.status(404).json({ error: 'Tag not found.' });
        if (tag.isSystem) return res.status(403).json({ error: `"${tag.name}" is a system tag and cannot be deleted.` });
        await CrmTag.findByIdAndDelete(req.params.tagId);
        res.json({ message: `Tag "${tag.name}" deleted.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 6. Issue a Sandigan Membership Card (SMC)
const issueSMC = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ error: 'Customer not found.' });

        // BLOCK: Shared Walk-in Profile cannot have a membership
        if (customer.email === 'walkin@example.com') {
            return res.status(403).json({ error: 'Cannot issue a membership to the shared Walk-in account. Please create a unique profile for this customer.' });
        }

        if (customer.hasSMC) return res.status(400).json({ error: 'Customer already has an active SMC.' });

        const config = await getResolvedSMCConfig();

        // Generate a 6-character alphanumeric ID
        const generateSMCId = () => {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let id = `${config.abbreviation || 'SMC'}-`;
            for (let i = 0; i < 6; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
            return id;
        };

        let isUnique = false;
        let newSmcId = '';
        while (!isUnique) {
            newSmcId = generateSMCId();
            const existing = await Customer.findOne({ smcId: newSmcId });
            if (!existing) isUnique = true;
        }

        customer.hasSMC = true;
        customer.smcId = newSmcId;
        customer.smcIssuedDate = new Date();

        const months = parseInt(config.validityMonths) || 0;
        if (months > 0) {
            const expiry = new Date();
            expiry.setMonth(expiry.getMonth() + months);
            customer.smcExpiryDate = expiry;
        } else {
            customer.smcExpiryDate = null;
        }

        // Add SMC tag automatically if not present
        if (!customer.tags.includes('SMC')) {
            customer.tags.push('SMC');
        }

        await customer.save();

        // Audit Log
        if (req.user) {
            await createLog({
                actorId: req.user.id,
                actorName: req.user.fullName || 'Admin',
                actorRole: req.user.role || 'admin',
                module: 'CRM',
                action: 'smc_issued',
                message: `Issued status card (${newSmcId}) to ${customer.firstName} ${customer.lastName}`,
                meta: { id: customer._id, smcId: newSmcId }
            });
        }

        // ── FINANCE ENGINE: Deduct SMC Card from Inventory ──────────────
        try {
            const { deductStockForProduct } = require('./serviceRecipeController');
            const { totalCost, category } = await deductStockForProduct('SMC Card');

            // Record as Expense if there's a tangible cost
            if (totalCost > 0) {
                await Expense.create({
                    title: `Inventory Deduction: SMC Card issued to ${customer.firstName}`,
                    amount: totalCost,
                    category: category || 'Supplies',
                    description: `Automatic stock deduction for membership card issuance. SMC: ${newSmcId}`,
                    date: new Date()
                });
            }
        } catch (invErr) {
            console.warn('[Inventory] SMC deduction skipped:', invErr.message);
        }

        // ── FINANCE ENGINE: Auto-record Membership Revenue ───────────────
        try {
            const { recordRevenue } = require('./revenueController');
            const smcPrice = config.price || 0;
            if (smcPrice > 0) {
                await recordRevenue({
                    title: `SMC Issued — ${customer.firstName} ${customer.lastName}`,
                    amount: smcPrice,
                    category: 'Membership',
                    source: 'SMC',
                    referenceId: newSmcId,
                    notes: `Sandigan Membership Card issued. Card ID: ${newSmcId}`,
                });
            }
        } catch (revErr) {
            console.warn('[Revenue] SMC revenue record skipped:', revErr.message);
        }

        res.json({ message: 'SMC issued successfully.', customer });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 7. Validate SMC (Used by Checkout / Booking Form)
const validateSMC = async (req, res) => {
    try {
        const { smcId } = req.params;
        const normalizedId = smcId?.trim().toUpperCase();
        if (!normalizedId) return res.status(400).json({ error: 'Please enter a valid card ID.' });

        let target = null;
        let isAssigned = false;
        let targetExpiryDate = null;

        // A. Check for registered CRM customer first
        const customer = await Customer.findOne({ smcId: normalizedId });

        if (customer) {
            target = customer;
            isAssigned = true;
            targetExpiryDate = customer.smcExpiryDate;
        } else {
            // B. Fallback to Membership log (covers anonymous walk-in cards)
            const Membership = require('../models/membershipModel');
            const log = await Membership.findOne({ cardId: normalizedId });
            if (log) {
                target = log;
                isAssigned = false;
                targetExpiryDate = log.expiryDate;
            }
        }

        if (!target) {
            return res.status(404).json({ error: 'Invalid or Unknown ID.' });
        }

        // Check if membership is expired (if expiry date exists)
        if (targetExpiryDate && new Date() > new Date(targetExpiryDate)) {
            return res.status(400).json({ error: 'Membership Expired. Please renew.' });
        }

        // Fetch current global discount configuration from settings
        const Setting = require('../models/settingModel');
        const setting = await Setting.findOne({ key: 'smc_config' });
        const discountPercentage = setting && setting.value ? setting.value.discountPercentage : 10;

        res.json({
            isValid: true,
            customer: isAssigned ? {
                id: target._id,
                firstName: target.firstName,
                lastName: target.lastName,
                email: target.email,
                smcId: target.smcId
            } : {
                id: null,
                firstName: 'Walk-in',
                lastName: 'Customer',
                email: 'walkin@example.com',
                smcId: target.cardId
            },
            discountPercentage
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Upserts a CRM Customer record from a completed booking.
 * Highly robust logic: Prioritizes SMC ID matching to find existing profiles correctly.
 * Returns the object with BOTH smcId and customerId.
 */
const upsertCustomerFromBooking = async ({ firstName, lastName, email, phone, vehicleType, totalPrice, completedAt, purchasedProducts = [], smcId }) => {
    // 1. Preparation & Normalization
    const normalizedEmail = email?.toLowerCase().trim() || null;
    const normalizedFirst = firstName?.trim() || 'Unknown';
    const normalizedLast = lastName?.trim() || 'Customer';
    const normalizedPhone = phone?.trim() || '00000000000';

    // Explicit Generic Walk-in detection
    const isGenericWalkIn = (normalizedFirst.toLowerCase() === 'walk-in' && normalizedLast.toLowerCase() === 'customer') ||
        normalizedEmail === 'walkin@example.com';

    // 2. Lookup existing profile
    let existing = null;
    let finalSMCId = smcId?.toUpperCase().trim() || null;

    // A. Priority 0: SMC ID Match (The most accurate way to find owners, even for anonymous bookings)
    if (finalSMCId) {
        existing = await Customer.findOne({ smcId: finalSMCId });
    }

    // B. Priority 1: Full Name Matching (Except generic "Walk-in Customer")
    if (!existing && normalizedFirst !== 'Unknown' && !isGenericWalkIn) {
        existing = await Customer.findOne({
            firstName: { $regex: new RegExp('^' + normalizedFirst + '$', 'i') },
            lastName: { $regex: new RegExp('^' + normalizedLast + '$', 'i') }
        });
    }

    // C. Priority 2: Email (if not generic)
    if (!existing && normalizedEmail && normalizedEmail !== 'walkin@example.com') {
        existing = await Customer.findOne({ email: normalizedEmail });
    }

    // D. Priority 3: Phone (if not default)
    if (!existing && normalizedPhone && normalizedPhone !== '00000000000') {
        existing = await Customer.findOne({ phone: normalizedPhone });
    }

    // E. Shared Walk-in Record Fallback (ONLY if NOT purchasing a membership)
    const isPurchasingSMC = purchasedProducts.some(p => p.productName?.toLowerCase().includes('smc'));

    if (!existing && isGenericWalkIn && !isPurchasingSMC) {
        existing = await Customer.findOne({ email: 'walkin@example.com' });

        // SELF-CLEAN: FORCE WIPE membership if it somehow exists on the generic profile
        if (existing && (existing.hasSMC || existing.smcId)) {
            await Customer.updateOne(
                { _id: existing._id },
                { $set: { hasSMC: false, smcId: null, smcExpiryDate: null }, $pull: { tags: 'SMC' } }
            );
            existing.hasSMC = false;
            existing.smcId = null;
        }
    }

    // 3. Execution (Update or Create)
    if (existing) {
        const newSpend = (existing.lifetimeSpend || 0) + (totalPrice || 0);
        const vehiclesSet = new Set(existing.vehicles || []);
        if (vehicleType) vehiclesSet.add(vehicleType);

        existing.lifetimeSpend = newSpend;
        existing.lastVisitDate = completedAt || new Date();
        existing.vehicles = Array.from(vehiclesSet);

        // SYNC: We re-calculate totalVisits based on actual Booking records to keep count 100% accurate
        const washCount = await Booking.countDocuments({
            $or: [
                { customerId: existing._id },
                { emailAddress: existing.email }
            ],
            status: 'Completed'
        });
        const rentalCount = await CarRental.countDocuments({ emailAddress: existing.email });
        const totalVisits = washCount + rentalCount + 1; // +1 because the current booking is about to be marked as completed

        existing.totalVisits = totalVisits;

        // Update tags
        const tagSet = new Set(existing.tags || []);
        if (totalVisits > 1) {
            tagSet.delete('New Customer');
            tagSet.add('Regular');
        }
        if (finalSMCId || purchasedProducts.some(p => p.productName?.toLowerCase().includes('smc'))) tagSet.add('SMC');
        existing.tags = Array.from(tagSet);

        // --- SPECIAL PROTECTION FOR SHARED WALK-IN PROFILE ---
        const isSharedWalkIn = (normalizedEmail === 'walkin@example.com' || existing.email === 'walkin@example.com');
        if (isSharedWalkIn) {
            if (!existing.tags.includes('Walk-in')) existing.tags.push('Walk-in');
            existing.tags = existing.tags.filter(t => t !== 'SMC');
        }

        // Auto-Issue SMC if purchased
        if (purchasedProducts.some(p => p.productName?.toLowerCase().includes('smc'))) {
            try {
                const config = await getResolvedSMCConfig();
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                let newId = `${config.abbreviation}-`;
                for (let i = 0; i < 6; i++) newId += chars.charAt(Math.floor(Math.random() * chars.length));

                if (!isSharedWalkIn) {
                    existing.hasSMC = true;
                    existing.smcId = newId;
                    existing.smcIssuedDate = new Date();
                    const months = parseInt(config.validityMonths) || 12;
                    const expiry = new Date();
                    expiry.setMonth(expiry.getMonth() + months);
                    existing.smcExpiryDate = expiry;
                    if (!existing.tags.includes('SMC')) existing.tags.push('SMC');
                }

                const Membership = require('../models/membershipModel');
                const expiry = new Date();
                expiry.setMonth(expiry.getMonth() + (config.validityMonths || 12));

                await Membership.create({
                    cardId: newId,
                    customerName: isSharedWalkIn ? 'Walk-in Customer' : `${normalizedFirst} ${normalizedLast}`,
                    expiryDate: expiry,
                    isAssigned: !isSharedWalkIn
                });

                finalSMCId = newId;
            } catch (smcErr) { console.error('[CRM] Auto-SMC failed:', smcErr.message); }
        } else if (existing.hasSMC) {
            finalSMCId = existing.smcId;
        }

        // Populate missing contact info
        if (normalizedEmail && normalizedEmail !== 'walkin@example.com' && !existing.email) existing.email = normalizedEmail;
        if (normalizedPhone && normalizedPhone !== '00000000000' && (!existing.phone || existing.phone === '00000000000')) existing.phone = normalizedPhone;

        await existing.save();
        return { smcId: finalSMCId, customerId: existing._id };
    } else {
        // Create new profile for REAL customers ONLY
        if (!isGenericWalkIn) {
            const newProfileData = {
                firstName: normalizedFirst,
                lastName: normalizedLast,
                email: (normalizedEmail === 'walkin@example.com' || !normalizedEmail) ? undefined : normalizedEmail,
                phone: normalizedPhone,
                totalVisits: 1,
                lifetimeSpend: totalPrice || 0,
                lastVisitDate: completedAt || new Date(),
                vehicles: vehicleType ? [vehicleType] : [],
                tags: ['New Customer']
            };

            if (smcId || purchasedProducts.some(p => p.productName?.toLowerCase().includes('smc'))) {
                try {
                    const config = await getResolvedSMCConfig();
                    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                    let gId = `${config.abbreviation}-`;
                    for (let i = 0; i < 6; i++) gId += chars.charAt(Math.floor(Math.random() * chars.length));

                    newProfileData.hasSMC = true;
                    newProfileData.smcId = gId;
                    newProfileData.smcIssuedDate = new Date();
                    const months = parseInt(config.validityMonths) || 12;
                    const expiry = new Date();
                    expiry.setMonth(expiry.getMonth() + months);
                    newProfileData.smcExpiryDate = expiry;
                    newProfileData.tags.push('SMC');
                    finalSMCId = gId;

                    const Membership = require('../models/membershipModel');
                    await Membership.create({
                        cardId: gId,
                        customerName: `${normalizedFirst} ${normalizedLast}`,
                        expiryDate: expiry,
                        isAssigned: true
                    });
                } catch (err) { console.error('[CRM] SMC creation failed:', err.message); }
            }

            const created = await Customer.create(newProfileData);
            return { smcId: finalSMCId, customerId: created._id };
        } else {
            // Purchases SMC with a completely generic walk-in name
            if (purchasedProducts.some(p => p.productName?.toLowerCase().includes('smc'))) {
                const config = await getResolvedSMCConfig();
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                let gId = `W-${config.abbreviation}-`;
                for (let i = 0; i < 6; i++) gId += chars.charAt(Math.floor(Math.random() * chars.length));

                finalSMCId = gId;
                const months = parseInt(config.validityMonths) || 12;
                const expiry = new Date();
                expiry.setMonth(expiry.getMonth() + months);

                const Membership = require('../models/membershipModel');
                await Membership.create({
                    cardId: gId,
                    customerName: 'Walk-in Customer',
                    expiryDate: expiry,
                    isAssigned: false
                });
            }
        }
    }

    return { smcId: finalSMCId, customerId: null };
};

const getSMCByCardId = async (req, res) => {
    try {
        const { smcId } = req.params;
        const normalizedId = smcId.trim().toUpperCase();

        const customer = await Customer.findOne({ smcId: normalizedId });

        if (!customer) {
            const Membership = require('../models/membershipModel');
            const log = await Membership.findOne({ cardId: normalizedId });
            if (!log) return res.status(404).json({ error: 'Card not found.' });

            return res.json({
                smcId: log.cardId,
                firstName: 'Anonymous',
                lastName: 'Customer',
                smcExpiryDate: log.expiryDate,
                isAssigned: false
            });
        }

        res.json({
            smcId: customer.smcId,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone,
            smcExpiryDate: customer.smcExpiryDate,
            isAssigned: true
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getSMCForBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ error: 'Booking not found.' });

        const smcIdInBooking = booking.smcId?.toUpperCase().trim() || null;
        const email = booking.emailAddress?.toLowerCase().trim() || null;
        const phone = booking.phoneNumber?.trim() || null;
        const firstName = booking.firstName?.trim() || 'Unknown';
        const lastName = booking.lastName?.trim() || 'Customer';

        let customer = null;

        // A. Priority 0: SMC ID (Fastest & most accurate)
        if (smcIdInBooking) {
            customer = await Customer.findOne({ smcId: smcIdInBooking });
        }

        // B. Priority 1: Name first (for unique profiles)
        if (!customer && firstName !== 'Unknown' && !(firstName.toLowerCase() === 'walk-in' && lastName.toLowerCase() === 'customer')) {
            customer = await Customer.findOne({
                firstName: { $regex: new RegExp('^' + firstName + '$', 'i') },
                lastName: { $regex: new RegExp('^' + lastName + '$', 'i') }
            });
        }

        // C. Priority 2: Email
        if (!customer && email && email !== 'walkin@example.com') {
            customer = await Customer.findOne({ email });
        }

        // D. Priority 3: Phone
        if (!customer && phone && phone !== '00000000000') {
            customer = await Customer.findOne({ phone });
        }

        // Shared Fallback
        if (!customer) {
            customer = await Customer.findOne({ email: 'walkin@example.com' });

            // SELF-CLEAN: If the shared record somehow got a membership, clear it immediately
            if (customer && customer.hasSMC) {
                customer.hasSMC = false;
                customer.smcId = null;
                customer.smcExpiryDate = null;
                await customer.save();
            }
        }

        if (!customer || !customer.hasSMC) {
            return res.status(404).json({ error: 'No membership found for this customer.' });
        }

        res.json({
            fullName: `${customer.firstName} ${customer.lastName}`,
            smcId: customer.smcId,
            issuedDate: customer.smcIssuedDate,
            expiryDate: customer.smcExpiryDate,
            status: 'Active'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getSMCConfig = async (req, res) => {
    try {
        const config = await getResolvedSMCConfig();
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getAllMemberships = async (req, res) => {
    try {
        const Membership = require('../models/membershipModel');
        const memberships = await Membership.find().sort({ expiryDate: 1 });
        res.json(memberships);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const renewSMC = async (req, res) => {
    try {
        const { smcId } = req.params;
        const { firstName, lastName, phone, email, isRegistering } = req.body;

        const Membership = require('../models/membershipModel');
        const config = await getResolvedSMCConfig();

        // 1. Find the card
        const card = await Membership.findOne({ cardId: smcId.toUpperCase().trim() });
        if (!card) return res.status(404).json({ error: 'Membership card not found' });

        // 2. Calculate New Expiry (STACKED LOGIC)
        const now = new Date();
        let currentExpiry = new Date(card.expiryDate);
        let newExpiry = new Date();

        if (currentExpiry > now) {
            // Still active: Add to the end of current expiry
            newExpiry = new Date(currentExpiry);
            newExpiry.setMonth(newExpiry.getMonth() + (config.validityMonths || 12));
        } else {
            // Expired: Start from today
            newExpiry.setMonth(newExpiry.getMonth() + (config.validityMonths || 12));
        }

        // 3. Update Membership Record
        card.expiryDate = newExpiry;
        card.status = 'Active';

        // 4. Personalization / Registration Logic
        let customerLinked = null;
        if (isRegistering && firstName && lastName) {
            const cleanEmail = (email && email.trim()) ? email.toLowerCase().trim() : '___none___';

            // Find existing CRM profile with smart logic:
            // 1. Same membership card ID
            // 2. OR same email address
            // 3. OR same first/last name BUT NOT if they already have a different SMC ID. 
            //    This prevents one person's card from hijacking another person with the same name.
            const existingCust = await Customer.findOne({
                $or: [
                    { smcId: card.cardId },
                    { email: cleanEmail },
                    {
                        firstName: firstName.trim(),
                        lastName: lastName.trim(),
                        $or: [
                            { smcId: { $in: [null, card.cardId] } },
                            { smcId: { $exists: false } }
                        ]
                    }
                ]
            });

            if (existingCust) {
                existingCust.hasSMC = true;
                existingCust.smcId = card.cardId;
                existingCust.smcExpiryDate = newExpiry;
                existingCust.firstName = firstName.trim();
                existingCust.lastName = lastName.trim();
                if (phone) existingCust.phone = phone;
                if (email && email.trim()) existingCust.email = email.toLowerCase().trim();
                else existingCust.email = undefined;
                if (!existingCust.tags.includes('SMC')) existingCust.tags.push('SMC');
                await existingCust.save();
                customerLinked = existingCust;
            } else {
                customerLinked = await Customer.create({
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    email: (email && email.trim()) ? email.toLowerCase().trim() : undefined,
                    phone: phone || '00000000000',
                    hasSMC: true,
                    smcId: card.cardId,
                    smcExpiryDate: newExpiry,
                    smcIssuedDate: card.issuedDate || new Date(),
                    tags: ['SMC', 'Regular']
                });
            }
            card.customerName = `${firstName} ${lastName}`;
            card.customerId = customerLinked._id;
            card.isAssigned = true;
        } else {
            // If already linked to a customer, update that customer's expiry date too
            const linkedCust = await Customer.findOne({ smcId: card.cardId });
            if (linkedCust) {
                linkedCust.smcExpiryDate = newExpiry;
                await linkedCust.save();
            }
        }

        await card.save();

        // 5. Financial Recording
        try {
            const { recordRevenue } = require('./revenueController');
            await recordRevenue({
                title: `SMC Renewal — ${card.customerName}`,
                amount: config.renewalPrice || 0,
                category: 'Membership',
                source: 'SMC',
                referenceId: card.cardId,
                notes: `Membership renewed until ${newExpiry.toLocaleDateString()}. Registering: ${isRegistering}`,
            });
        } catch (revErr) { console.error('[Revenue] Renewal logic skipped revenue recording:', revErr.message); }

        res.json({
            message: 'Membership renewed successfully!',
            newExpiry,
            customerName: card.customerName,
            isAssigned: card.isAssigned
        });
    } catch (err) {
        console.error('[SMC-Renewal] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getAllCustomers,
    getCustomerStats,
    updateCustomerCRM,
    deleteCustomer,
    syncBookingsToCRM,
    createCustomer,
    getAllTags,
    createTag,
    updateTag,
    deleteTag,
    issueSMC,
    validateSMC,
    upsertCustomerFromBooking,
    getSMCByCardId,
    getSMCForBooking,
    getSMCConfig,
    getAllMemberships,
    renewSMC
};
