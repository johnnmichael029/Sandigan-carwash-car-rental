const Pricing = require('../models/pricingModel');
const { PRICE_LIST } = require('../utils/priceList'); // The old static list used for initial seed

const ARMOR_ADDON_PRICE = 100; // Will stay as a flat rate for now, but could be global setting later

// Seed the DB if it is empty
const seedPricingIfNotExists = async () => {
    try {
        const count = await Pricing.countDocuments();
        if (count === 0) {
            console.log("Seeding Pricing Database...");
            const seedData = Object.entries(PRICE_LIST).map(([vehicleType, services]) => {
                return {
                    vehicleType,
                    Wash: services.Wash,
                    Armor: services.Armor,
                    Wax: services.Wax,
                    Engine: services.Engine
                };
            });
            await Pricing.insertMany(seedData);
            console.log("Pricing Seeding Complete.");
        }
    } catch (err) {
        console.error("Error seeding pricing data:", err);
    }
};

const getPricing = async (req, res) => {
    try {
        await seedPricingIfNotExists();
        const pricesFromDb = await Pricing.find().sort({ createdAt: 1 });
        
        // Convert to the exact frontend dictionary format to minimize UI rewrite
        const priceDict = {};
        pricesFromDb.forEach(doc => {
            priceDict[doc.vehicleType] = {
                Wash: doc.Wash,
                Armor: doc.Armor,
                Wax: doc.Wax,
                Engine: doc.Engine
            };
        });

        res.status(200).json({ priceList: priceDict, armorPrice: ARMOR_ADDON_PRICE });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch pricing data" });
    }
};

const calculateTotalFromDb = async (vehicleType, serviceArray) => {
    await seedPricingIfNotExists();
    const doc = await Pricing.findOne({ vehicleType });
    if (!doc || !Array.isArray(serviceArray)) return 0;

    return serviceArray.reduce((sum, service) => {
        if (service === 'Armor') {
            return doc.Armor ? sum + ARMOR_ADDON_PRICE : sum;
        }
        const price = doc[service];
        return sum + (typeof price === 'number' ? price : 0);
    }, 0);
};

module.exports = {
    getPricing,
    calculateTotalFromDb,
    ARMOR_ADDON_PRICE // exported in case needed
};
