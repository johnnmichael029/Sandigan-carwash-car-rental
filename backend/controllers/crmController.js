const Customer = require('../models/customerModel');
const Booking = require('../models/bookingModel');
const CrmTag = require('../models/crmTagModel');
const Expense = require('../models/expenseModel');

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
            discountPercentage: val.discountPercentage || 0
        };
    } catch (err) {
        console.error('[SMC-CONFIG] Error resolving config:', err.message);
        return { cardName: "Sandigan Membership Card", cardColor: "#0f172a", validityMonths: 12, abbreviation: 'SMC', price: 500, discountPercentage: 0 };
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

        // Get their booking history
        const bookings = await Booking.find({ emailAddress: customer.email }).sort({ createdAt: -1 });

        res.json({ customer, history: bookings });
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
        if (phone !== undefined) updateFields.phone = phone;
        if (vehicles !== undefined) updateFields.vehicles = vehicles;
        if (notes !== undefined) updateFields.notes = notes;
        if (tags !== undefined) updateFields.tags = tags;

        const updated = await Customer.findByIdAndUpdate(req.params.id, updateFields, { returnDocument: 'after', runValidators: true });
        if (!updated) return res.status(404).json({ error: 'Customer not found.' });
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
        const deleted = await Customer.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Customer not found.' });
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
            phone,
            vehicles: vehicles ? vehicles.split(',').map(v => v.trim()).filter(Boolean) : [],
            notes: notes || '',
            tags: ['New Customer']
        });

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
// (For ERP Phase 2 migration)
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
                const totalSpend = allBks.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
                const vehiclesSet = new Set(allBks.map(b => b.vehicleType).filter(Boolean));
                const latestDate = allBks.sort((a, b) => b.updatedAt - a.updatedAt)[0].updatedAt;

                existing.totalVisits = allBks.length;
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

// 7. Validate SMC (Used by Checkout Scanner)
const validateSMC = async (req, res) => {
    try {
        const { smcId } = req.params;
        const normalizedId = smcId.replace(/\s+/g, '').toUpperCase();
        const customer = await Customer.findOne({ smcId: normalizedId, hasSMC: true });

        if (!customer) {
            return res.status(404).json({ error: 'Invalid or Unknown ID.' });
        }

        if (customer.smcExpiryDate && new Date() > customer.smcExpiryDate) {
            return res.status(400).json({ error: 'Membership Expired. Please renew.' });
        }

        // Fetch current global discount
        const Setting = require('../models/settingModel');
        const setting = await Setting.findOne({ key: 'smc_config' });
        const discountPercentage = setting && setting.value ? setting.value.discountPercentage : 10; // Default 10%

        res.json({
            isValid: true,
            customer: {
                id: customer._id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
                smcId: customer.smcId
            },
            discountPercentage
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Upserts a CRM Customer record from a completed booking.
 * Highly robust logic: Prioritizes Name matching followed by Contact info.
 * Avoids dumping everything into 'Walk-in Customer' if a name is provided.
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

    // A. Priority 0: SMC ID Match (The most accurate way to find anonymous members)
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
        const newVisits = (existing.totalVisits || 0) + 1;
        const newSpend = (existing.lifetimeSpend || 0) + (totalPrice || 0);
        const vehiclesSet = new Set(existing.vehicles || []);
        if (vehicleType) vehiclesSet.add(vehicleType);

        existing.totalVisits = newVisits;
        existing.lifetimeSpend = newSpend;
        existing.lastVisitDate = completedAt || new Date();
        existing.vehicles = Array.from(vehiclesSet);

        // Update tags
        const tagSet = new Set(existing.tags || []);
        if (newVisits > 1) {
            tagSet.delete('New Customer');
            tagSet.add('Regular');
        }
        if (smcId || purchasedProducts.some(p => p.productName?.toLowerCase().includes('smc'))) tagSet.add('SMC');
        existing.tags = Array.from(tagSet);

        // --- SPECIAL PROTECTION FOR SHARED WALK-IN PROFILE ---
        const isSharedWalkIn = (normalizedEmail === 'walkin@example.com');
        if (isSharedWalkIn) {
            if (!existing.tags.includes('Walk-in')) existing.tags.push('Walk-in');
            // Remove 'SMC' from tags list of the shared profile to avoid confusing the UI (the cards are unique)
            existing.tags = existing.tags.filter(t => t !== 'SMC'); 
        }

        // Auto-Issue SMC if purchased
        if (purchasedProducts.some(p => p.productName?.toLowerCase().includes('smc'))) {
            try {
                const config = await getResolvedSMCConfig();
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                let newId = `${config.abbreviation}-`;
                for (let i = 0; i < 6; i++) newId += chars.charAt(Math.floor(Math.random() * chars.length));

                // If not shared-profile, we update the customer record directly
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

                // ALWAYS create a Membership record for the scanner and transaction
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
            } catch (smcErr) {
                console.error('[CRM] Auto-SMC generation failed:', smcErr.message);
            }
        } else if (existing.hasSMC) {
            // Keep track of the existing ID if it's a real person
            finalSMCId = existing.smcId;
        }

        // Populate missing contact info
        if (normalizedEmail && normalizedEmail !== 'walkin@example.com' && !existing.email) {
            existing.email = normalizedEmail;
        }
        if (normalizedPhone && normalizedPhone !== '00000000000' && (!existing.phone || existing.phone === '00000000000')) {
            existing.phone = normalizedPhone;
        }
        console.log("Existing customer updated:", existing);
        await existing.save();
    } else {
        // Create new profile for REAL customers ONLY
        if (!isGenericWalkIn) {
            const newProfile = {
                firstName: normalizedFirst,
                lastName: normalizedLast,
                email: (normalizedEmail === 'walkin@example.com' || normalizedEmail === 'walkin1@example.com') ? '' : normalizedEmail,
                phone: normalizedPhone,
                totalVisits: 1,
                lifetimeSpend: totalPrice || 0,
                lastVisitDate: completedAt || new Date(),
                vehicles: vehicleType ? [vehicleType] : [],
                tags: ['New Customer']
            };

            // If a named customer buys or uses SMC, we bind it
            if (smcId || purchasedProducts.some(p => p.productName?.toLowerCase().includes('smc'))) {
                try {
                    const config = await getResolvedSMCConfig();
                    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                    let gId = `${config.abbreviation}-`;
                    for (let i = 0; i < 6; i++) gId += chars.charAt(Math.floor(Math.random() * chars.length));

                    newProfile.hasSMC = true;
                    newProfile.smcId = gId;
                    newProfile.smcIssuedDate = new Date();

                    const months = parseInt(config.validityMonths) || 12;
                    const expiry = new Date();
                    expiry.setMonth(expiry.getMonth() + months);
                    newProfile.smcExpiryDate = expiry;
                    
                    newProfile.tags.push('SMC');
                    finalSMCId = gId;

                    // Also create a Membership record for the scanner/tracking
                    const Membership = require('../models/membershipModel');
                    await Membership.create({
                        cardId: gId,
                        customerName: `${normalizedFirst} ${normalizedLast}`,
                        expiryDate: expiry,
                        isAssigned: true
                    });
                } catch (err) {
                    console.error('[CRM] SMC creation failed:', err.message);
                }
            }

            await Customer.create(newProfile);
        } else {
            // It was a generic walk-in but 'existing' was null (extremely rare if setup correct)
            // If they bought an SMC here, we still need to generate the ID for the booking record
            if (purchasedProducts.some(p => p.productName?.toLowerCase().includes('smc'))) {
                const config = await getResolvedSMCConfig();
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                let gId = `W-${config.abbreviation}-`; // Prefix with W for Walk-in cards
                for (let i = 0; i < 6; i++) gId += chars.charAt(Math.floor(Math.random() * chars.length));
                
                finalSMCId = gId;

                const months = parseInt(config.validityMonths) || 12;
                const expiry = new Date();
                expiry.setMonth(expiry.getMonth() + months);

                // Create anonymous membership record
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

    return { smcId: finalSMCId };
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

const getSMCByCardId = async (req, res) => {
    try {
        const { smcId } = req.params;
        const Membership = require('../models/membershipModel');
        const card = await Membership.findOne({ cardId: smcId });

        if (!card) {
            return res.status(404).json({ error: 'Membership card not found' });
        }

        res.json({
            smcId: card.cardId,
            firstName: card.customerName?.split(' ')[0] || 'Member',
            lastName: card.customerName?.split(' ').slice(1).join(' ') || '',
            smcExpiryDate: card.expiryDate,
            hasSMC: true
        });
    } catch (err) {
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
    getSMCConfig
};
