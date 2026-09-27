const Pricing = require('../models/pricingModel');
const { PRICE_LIST } = require('../utils/priceList');

const ARMOR_ADDON_PRICE = 100;

const NEW_ADDONS = [
    { name: 'Buffing (1 side)', price: 500 },
    { name: 'Buffing (Full)', price: 2500 },
    { name: 'Detailing', price: 2500 },
    { name: 'Acid Rain', price: 1000 },
    { name: 'Hand wax', price: 1200 }
];

const getVehicleTier = (vType) => {
    if (!vType) return 'S';
    const lower = vType.toLowerCase();
    if (lower.includes('motorcycle') || lower.includes('bike') || lower.includes('125cc')) return 'Motorcycle';
    if (lower.includes('van') || lower.includes('hiace') || lower.includes('urvan') || lower.includes('alphard')) return 'XL';
    if (lower.includes('suv') || lower.includes('pickup') || lower.includes('fortuner') || lower.includes('montero') || lower.includes('everest')) return 'L';
    if (lower.includes('innova') || lower.includes('crossover') || lower.includes('cuv') || lower.includes('mpv') || lower.includes('ertiga') || lower.includes('veloz') || lower.includes('crosswind') || lower.includes('adventure')) return 'M';
    return 'S';
};

const DEFAULT_PREMIUM_WASHES = (tier) => {
    const regularPrices = { S: 150, M: 200, L: 250, XL: 300, Motorcycle: 150 };
    const premiumPrices = { S: 230, M: 300, L: 350, XL: 500, Motorcycle: 200 };
    const mcPrices = { Motorcycle: 140, S: 140, M: 140, L: 140, XL: 140 };

    return [
        {
            name: 'Regular Wash',
            price: regularPrices[tier] || 150,
            description: 'Essential wash & vacuum clean',
            inclusions: ['Vacuum Cleaning', 'Body Wash', 'Tire Black Dressing', 'Glass Cleaning'],
            savings: '30 MINS',
            category: 'premium'
        },
        {
            name: 'Premium Wash',
            price: premiumPrices[tier] || 230,
            badge: 'BEST VALUE',
            description: 'Deep clean + hydrophobic spray wax protection',
            inclusions: ['Deep Vacuum Cleaning', 'Body Wash', 'Tire Black Dressing', 'Glass Cleaning', 'Spray Wax Protection', 'Full Interior Dressing', 'Air Freshener'],
            savings: 'PROTECTION & SHINE',
            category: 'premium'
        },
        {
            name: 'Motorcycle Wash',
            price: mcPrices[tier] || 140,
            description: 'Full bike degrease & wheel/chain wash',
            inclusions: ['Full Body Wash & Degrease', 'Chain & Wheel Cleaning', 'Tire Shine Dressing', 'Glass & Mirror Wipe'],
            savings: '20 MINS',
            category: 'premium'
        }
    ];
};

const DEFAULT_RESTORE_PACKAGES = (tier) => {
    const saverPrices = { S: 1550, M: 1650, L: 1750, XL: 1950, Motorcycle: 1550 };
    const standardPrices = { S: 2150, M: 2250, L: 2350, XL: 2550, Motorcycle: 2150 };
    const supremePrices = { S: 3550, M: 3850, L: 4150, XL: 4550, Motorcycle: 3550 };

    return [
        {
            name: 'Saver Package',
            price: saverPrices[tier] || 1550,
            description: 'Essential restoration & Sanitation',
            inclusions: [
                'Premium Carwash (Body Wash, Vacuum, Interior Dressing, Spray Wax, Tire Black)',
                'Fogging Sanitation (Back to Zero)',
                'Acid Rain Removal (Glass)',
                'Engine Wash'
            ],
            savings: 'SAVES ₱600',
            category: 'restore'
        },
        {
            name: 'Standard Package',
            price: standardPrices[tier] || 2150,
            badge: 'MOST POPULAR',
            description: 'Hydrophobic hand wax & plastic trim restore',
            inclusions: [
                'Premium Carwash (Body Wash, Vacuum, Interior Dressing, Tire Black)',
                'Hand Wax (Hydrophobic Wax)',
                'Fogging Sanitation (Back to Zero)',
                'Acid Rain Removal (Glass)',
                'Back to Back (Plastic Trim Restore)',
                'Engine Wash'
            ],
            savings: 'SAVES ₱800',
            category: 'restore'
        },
        {
            name: 'Supreme Package',
            price: supremePrices[tier] || 3550,
            badge: 'BEST VALUE',
            description: 'Machine buffing wax & headlight restoration',
            inclusions: [
                'Premium Carwash (Body Wash, Vacuum, Interior Dressing, Tire Black)',
                'Fogging Sanitation (Back to Zero)',
                'Acid Rain Removal',
                'Engine Wash',
                'Machine Wax (Buffing)',
                'Back to Black',
                'Headlight Restoration w/ Coating',
                'Under Wash'
            ],
            savings: 'SAVES ₱1,350',
            category: 'restore'
        }
    ];
};

const seedPricingIfNotExists = async () => {
    try {
        // Clean up dummy standard categories if they were previously created
        await Pricing.deleteMany({ vehicleType: { $regex: /Small Car|Crossover \/ MPV|Pick-Up Truck|HiAce \/ Urvan|125cc-1000cc/i } });

        const count = await Pricing.countDocuments();
        if (count === 0) {
            const seedData = Object.keys(PRICE_LIST).map((vehicleType) => {
                const tier = getVehicleTier(vehicleType);
                return {
                    vehicleType,
                    services: DEFAULT_PREMIUM_WASHES(tier),
                    restorePackages: DEFAULT_RESTORE_PACKAGES(tier),
                    addons: [...NEW_ADDONS]
                };
            });
            await Pricing.insertMany(seedData);
        } else {
            // Ensure all PRICE_LIST vehicles exist
            for (let vehicleType of Object.keys(PRICE_LIST)) {
                const exists = await Pricing.findOne({ vehicleType });
                if (!exists) {
                    const tier = getVehicleTier(vehicleType);
                    await Pricing.create({
                        vehicleType,
                        services: DEFAULT_PREMIUM_WASHES(tier),
                        restorePackages: DEFAULT_RESTORE_PACKAGES(tier),
                        addons: [...NEW_ADDONS]
                    });
                }
            }

            // Migrate existing docs if restorePackages is empty or services contains legacy names ("Wash")
            const docs = await Pricing.find();
            for (let doc of docs) {
                let modified = false;
                const tier = getVehicleTier(doc.vehicleType);

                // Upgrade services if legacy
                const hasLegacyServices = doc.services?.some(s => s.name === 'Wash' || s.name === 'Engine' || s.name === 'Wax');
                if (!doc.services || doc.services.length === 0 || hasLegacyServices) {
                    doc.services = DEFAULT_PREMIUM_WASHES(tier);
                    modified = true;
                }

                // Upgrade restorePackages if empty
                if (!doc.restorePackages || doc.restorePackages.length === 0) {
                    doc.restorePackages = DEFAULT_RESTORE_PACKAGES(tier);
                    modified = true;
                }

                if (!doc.addons || doc.addons.length === 0) {
                    doc.addons = [...NEW_ADDONS];
                    modified = true;
                }

                // Clean up leading numbers (1., 2., etc.) from inclusions in DB
                if (doc.restorePackages) {
                    doc.restorePackages.forEach(pkg => {
                        if (pkg.inclusions) {
                            const cleaned = pkg.inclusions.map(inc => typeof inc === 'string' ? inc.replace(/^\d+\.\s*/, '') : inc);
                            if (JSON.stringify(cleaned) !== JSON.stringify(pkg.inclusions)) {
                                pkg.inclusions = cleaned;
                                modified = true;
                            }
                        }
                    });
                }

                if (modified) {
                    await doc.save();
                }
            }
        }
    } catch (err) {
        console.error("Error seeding pricing data:", err);
    }
};

const getPricing = async (req, res) => {
    try {
        await seedPricingIfNotExists();
        const pricesFromDb = await Pricing.find().sort({ createdAt: 1 });

        const priceList = {};
        const dynamicPricing = [];

        pricesFromDb.forEach(doc => {
            // New UI format
            dynamicPricing.push({
                _id: doc._id,
                vehicleType: doc.vehicleType,
                services: doc.services || [],
                restorePackages: doc.restorePackages || [],
                addons: doc.addons || []
            });

            // Legacy format bridge
            priceList[doc.vehicleType] = {
                Wash: doc.services?.find(s => s.name === 'Wash')?.price ?? doc.Wash ?? null,
                Armor: doc.addons?.find(a => a.name === 'Armor') ? true : doc.Armor ?? false,
                Wax: doc.services?.find(s => s.name === 'Wax')?.price ?? doc.Wax ?? null,
                Engine: doc.services?.find(s => s.name === 'Engine')?.price ?? doc.Engine ?? null
            };
        });

        res.status(200).json({ priceList, dynamicPricing, armorPrice: ARMOR_ADDON_PRICE });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch pricing data" });
    }
};

const calculateTotalFromDb = async (vehicleType, serviceArray) => {
    await seedPricingIfNotExists();
    const doc = await Pricing.findOne({ vehicleType });
    if (!doc || !Array.isArray(serviceArray)) return 0;

    return serviceArray.reduce((sum, serviceName) => {
        const serv = doc.services?.find(s => s.name === serviceName);
        const pkg = doc.restorePackages?.find(p => p.name === serviceName);
        const add = doc.addons?.find(a => a.name === serviceName);

        if (serv) return sum + serv.price;
        if (pkg) return sum + pkg.price;
        if (add) return sum + add.price;

        // Fallback checks
        if (serviceName === 'Armor' && doc.Armor) return sum + ARMOR_ADDON_PRICE;
        const legacyPrice = doc[serviceName];
        return sum + (typeof legacyPrice === 'number' ? legacyPrice : 0);
    }, 0);
};

const createVehiclePricing = async (req, res) => {
    try {
        const { vehicleType, services, restorePackages, addons } = req.body;
        const exists = await Pricing.findOne({ vehicleType });
        if (exists) return res.status(400).json({ error: 'Vehicle Type already exists' });

        const newDoc = new Pricing({ vehicleType, services, restorePackages: restorePackages || [], addons: addons || [] });
        await newDoc.save();

        // Emit real-time update
        const io = req.app.get('io');
        if (io) io.emit('pricing_updated');

        res.status(201).json(newDoc);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create vehicle pricing' });
    }
};

const updateVehiclePricing = async (req, res) => {
    try {
        const { vehicleType, services, restorePackages, addons } = req.body;
        const updated = await Pricing.findByIdAndUpdate(req.params.id,
            { vehicleType, services: services || [], restorePackages: restorePackages || [], addons: addons || [] },
            { new: true }
        );

        // Emit real-time update
        const io = req.app.get('io');
        if (io) io.emit('pricing_updated');

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update vehicle pricing' });
    }
};

const deleteVehiclePricing = async (req, res) => {
    try {
        await Pricing.findByIdAndDelete(req.params.id);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) io.emit('pricing_updated');

        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete vehicle' });
    }
};

module.exports = {
    getPricing,
    calculateTotalFromDb,
    updateVehiclePricing,
    createVehiclePricing,
    deleteVehiclePricing,
    ARMOR_ADDON_PRICE
};
