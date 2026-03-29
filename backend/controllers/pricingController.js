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

const seedPricingIfNotExists = async () => {
    try {
        const count = await Pricing.countDocuments();
        if (count === 0) {
            console.log("Seeding Pricing Database with generic structure...");
            const seedData = Object.entries(PRICE_LIST).map(([vehicleType, s]) => {
                const services = [];
                const addons = [...NEW_ADDONS];

                if (typeof s.Wash === 'number') services.push({ name: 'Wash', price: s.Wash });
                if (typeof s.Engine === 'number') services.push({ name: 'Engine', price: s.Engine });
                if (typeof s.Wax === 'number') services.push({ name: 'Wax', price: s.Wax });
                if (s.Armor === true) addons.push({ name: 'Armor', price: ARMOR_ADDON_PRICE });

                return {
                    vehicleType,
                    services,
                    addons,
                    Wash: s.Wash,
                    Armor: s.Armor,
                    Wax: s.Wax,
                    Engine: s.Engine
                };
            });
            await Pricing.insertMany(seedData);
            console.log("Pricing Seeding Complete.");
        } else {
            // Migrate legacy docs if they don't have arrays yet
            const legacyDocs = await Pricing.find({ 'services.0': { $exists: false }, Wash: { $exists: true } });
            if (legacyDocs.length > 0) {
                console.log(`Migrating ${legacyDocs.length} legacy pricing docs to dynamic structure...`);
                for (let doc of legacyDocs) {
                    const services = [];
                    const addons = [...NEW_ADDONS];

                    if (typeof doc.Wash === 'number') services.push({ name: 'Wash', price: doc.Wash });
                    if (typeof doc.Engine === 'number') services.push({ name: 'Engine', price: doc.Engine });
                    if (typeof doc.Wax === 'number') services.push({ name: 'Wax', price: doc.Wax });
                    if (doc.Armor === true) addons.push({ name: 'Armor', price: ARMOR_ADDON_PRICE });

                    doc.services = services;
                    doc.addons = addons;
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
        const add = doc.addons?.find(a => a.name === serviceName);

        if (serv) return sum + serv.price;
        if (add) return sum + add.price;

        // Fallback checks
        if (serviceName === 'Armor' && doc.Armor) return sum + ARMOR_ADDON_PRICE;
        const legacyPrice = doc[serviceName];
        return sum + (typeof legacyPrice === 'number' ? legacyPrice : 0);
    }, 0);
};

const createVehiclePricing = async (req, res) => {
    try {
        const { vehicleType, services, addons } = req.body;
        const exists = await Pricing.findOne({ vehicleType });
        if (exists) return res.status(400).json({ error: 'Vehicle Type already exists' });

        const newDoc = new Pricing({ vehicleType, services, addons });
        await newDoc.save();
        res.status(201).json(newDoc);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create vehicle pricing' });
    }
};

const updateVehiclePricing = async (req, res) => {
    try {
        const { vehicleType, services, addons } = req.body;
        const updated = await Pricing.findByIdAndUpdate(req.params.id,
            { vehicleType, services, addons },
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update vehicle pricing' });
    }
};

const deleteVehiclePricing = async (req, res) => {
    try {
        await Pricing.findByIdAndDelete(req.params.id);
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
