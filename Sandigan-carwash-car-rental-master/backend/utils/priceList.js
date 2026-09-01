// Sandigan Carwash - Price List (Backend copy)
// Kept in sync with frontend/src/utils/priceList.js

const ARMOR_ADDON_PRICE = 100;

const PRICE_LIST = {
    Hatchback: { Wash: 140, Armor: true, Wax: 400, Engine: 450 },
    Sedan: { Wash: 150, Armor: true, Wax: 450, Engine: 500 },
    Compact: { Wash: 180, Armor: true, Wax: 500, Engine: 550 },
    Montero: { Wash: 250, Armor: true, Wax: 550, Engine: 600 },
    Fortuner: { Wash: 250, Armor: true, Wax: 550, Engine: 600 },
    Innova: { Wash: 250, Armor: true, Wax: 550, Engine: 600 },
    Adventure: { Wash: 250, Armor: true, Wax: 550, Engine: 600 },
    Crosswind: { Wash: 250, Armor: true, Wax: 550, Engine: 600 },
    Everest: { Wash: 250, Armor: true, Wax: 550, Engine: 600 },
    Ertiga: { Wash: 250, Armor: true, Wax: 550, Engine: 600 },
    Veloz: { Wash: 250, Armor: true, Wax: 550, Engine: 500 },
    Changan: { Wash: 180, Armor: true, Wax: 550, Engine: 450 },
    'Pick Up': { Wash: 280, Armor: true, Wax: 600, Engine: 650 },
    Van: { Wash: 280, Armor: true, Wax: 700, Engine: 750 },
    L300: { Wash: 280, Armor: true, Wax: 750, Engine: 800 },
    Travis: { Wash: 280, Armor: true, Wax: 750, Engine: 800 },
    Jeep: { Wash: 300, Armor: null, Wax: null, Engine: 800 },
    'Big Bike': { Wash: 160, Armor: true, Wax: 250, Engine: null },
    '150cc': { Wash: 140, Armor: null, Wax: 200, Engine: null },
    '125cc': { Wash: 130, Armor: null, Wax: 150, Engine: null },
    '100cc': { Wash: 120, Armor: null, Wax: 100, Engine: null },
    Tricycle: { Wash: 150, Armor: null, Wax: null, Engine: null },
};

function calculateTotal(vehicleType, services) {
    const prices = PRICE_LIST[vehicleType];
    if (!prices || !Array.isArray(services)) return 0;

    return services.reduce((sum, service) => {
        if (service === 'Armor') {
            return prices.Armor ? sum + ARMOR_ADDON_PRICE : sum;
        }
        const price = prices[service];
        return sum + (typeof price === 'number' ? price : 0);
    }, 0);
}

module.exports = { PRICE_LIST, ARMOR_ADDON_PRICE, calculateTotal };
