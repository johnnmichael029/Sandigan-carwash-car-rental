const BRAND_MAP = {
    // Toyota
    'Fortuner': { brand: 'Toyota', fullName: 'Toyota Fortuner' },
    'Innova': { brand: 'Toyota', fullName: 'Toyota Innova' },
    'Veloz': { brand: 'Toyota', fullName: 'Toyota Veloz' },
    'Vios': { brand: 'Toyota', fullName: 'Toyota Vios' },
    'Wigo': { brand: 'Toyota', fullName: 'Toyota Wigo' },
    'Avanza': { brand: 'Toyota', fullName: 'Toyota Avanza' },

    // Mitsubishi
    'Montero': { brand: 'Mitsubishi', fullName: 'Mitsubishi Montero Sport' },
    'Adventure': { brand: 'Mitsubishi', fullName: 'Mitsubishi Adventure' },
    'L300': { brand: 'Mitsubishi', fullName: 'Mitsubishi L300' },
    'X-pander Cross': { brand: 'Mitsubishi', fullName: 'Mitsubishi Xpander Cross' },
    'Mirage C4': { brand: 'Mitsubishi', fullName: 'Mitsubishi Mirage G4' },

    // Isuzu
    'Crosswind': { brand: 'Isuzu', fullName: 'Isuzu Crosswind' },

    // Ford
    'Everest': { brand: 'Ford', fullName: 'Ford Everest' },

    // Suzuki
    'Ertiga': { brand: 'Suzuki', fullName: 'Suzuki Ertiga' },

    // Honda
    'Honda Civic': { brand: 'Honda', fullName: 'Honda Civic' },

    // Changan / Foton / Other Models
    'Changan': { brand: 'Changan', fullName: 'Changan Cars' },
    'Travis': { brand: 'Foton / Chevrolet', fullName: 'Travis / Foton Gratour' },

    // Body Types / General Categories
    'Hatchback': { brand: 'General Categories', fullName: 'Hatchback' },
    'Sedan': { brand: 'General Categories', fullName: 'Sedan' },
    'Compact': { brand: 'General Categories', fullName: 'Compact' },
    'MVP': { brand: 'General Categories', fullName: 'MPV / Multi-Purpose Vehicle' },
    'MPV': { brand: 'General Categories', fullName: 'MPV / Multi-Purpose Vehicle' },
    'SUV': { brand: 'General Categories', fullName: 'SUV' },
    'Midsize SUV': { brand: 'General Categories', fullName: 'Midsize SUV' },
    'Pick Up': { brand: 'General Categories', fullName: 'Pick-Up Truck' },
    'Van': { brand: 'General Categories', fullName: 'Van' },
    'Jeep': { brand: 'General Categories', fullName: 'Jeep / Utility' },

    // Motorcycles
    'Big Bike': { brand: 'Motorcycles & Bikes', fullName: 'Big Bike (400cc+)' },
    '150cc': { brand: 'Motorcycles & Bikes', fullName: 'Motorcycle 150cc' },
    '125cc': { brand: 'Motorcycles & Bikes', fullName: 'Motorcycle 125cc' },
    '100cc': { brand: 'Motorcycles & Bikes', fullName: 'Motorcycle 100cc' },
    'Tricycle': { brand: 'Motorcycles & Bikes', fullName: 'Tricycle' }
};

export const groupVehiclesByBrand = (items) => {
    if (!items || !Array.isArray(items)) return [];

    const defaultBrandOrder = ['Toyota', 'Mitsubishi', 'Isuzu', 'Ford', 'Suzuki', 'Honda', 'Changan', 'Foton / Chevrolet', 'Other Brands', 'General Categories', 'Motorcycles & Bikes'];
    const groups = {};

    items.forEach(v => {
        const typeName = typeof v === 'string' ? v : (v.vehicleType || v.vehicleName || '');
        if (!typeName) return;

        const id = typeof v === 'object' && v._id ? v._id : typeName;
        const adminConfiguredGroup = typeof v === 'object' && v.brandGroup ? v.brandGroup.trim() : '';
        const meta = BRAND_MAP[typeName] || null;

        let brand = 'General Categories';
        let displayName = typeName;

        if (adminConfiguredGroup) {
            brand = adminConfiguredGroup;
            displayName = meta && meta.fullName && typeName !== meta.fullName ? `${typeName} (${meta.fullName})` : typeName;
        } else if (meta) {
            brand = meta.brand;
            displayName = typeName === meta.fullName ? typeName : `${typeName} (${meta.fullName})`;
        } else if (/toyota/i.test(typeName)) {
            brand = 'Toyota';
        } else if (/mitsubishi/i.test(typeName)) {
            brand = 'Mitsubishi';
        } else if (/isuzu/i.test(typeName)) {
            brand = 'Isuzu';
        } else if (/ford/i.test(typeName)) {
            brand = 'Ford';
        } else if (/suzuki/i.test(typeName)) {
            brand = 'Suzuki';
        } else if (/honda/i.test(typeName)) {
            brand = 'Honda';
        } else if (/bike|cc|tricycle/i.test(typeName)) {
            brand = 'Motorcycles & Bikes';
        } else {
            brand = 'Other Brands';
        }

        if (!groups[brand]) groups[brand] = [];
        groups[brand].push({ id, value: typeName, label: displayName });
    });

    // Build final sorted list of groups: first standard brands in order, then custom admin groups
    const presentBrands = Object.keys(groups);
    const orderedBrandList = [
        ...defaultBrandOrder.filter(b => presentBrands.includes(b)),
        ...presentBrands.filter(b => !defaultBrandOrder.includes(b))
    ];

    return orderedBrandList
        .map(b => ({ brand: b, items: groups[b] }))
        .filter(g => g.items && g.items.length > 0);
};
