const STANDARD_VEHICLE_CATEGORIES = [
    'Sedan',
    'SUV',
    'MPV / AUV',
    'Hatchback / Compact',
    'Van',
    'Pick-up',
    'Motorcycle',
    'Jeep / Utility',
    'Other'
];

// Fallback categorizer for models or types not explicitly configured in DB
const mapToVehicleCategory = (rawType) => {
    if (!rawType || typeof rawType !== 'string') return 'Other';
    const trimmed = rawType.trim();
    const lower = trimmed.toLowerCase();

    // 1. Motorcycles & Bikes
    if (
        lower.includes('cc') ||
        lower.includes('bike') ||
        lower.includes('motorcycle') ||
        lower.includes('tricycle') ||
        lower.includes('scooter')
    ) {
        return 'Motorcycle';
    }

    // 2. Pick-up Trucks
    if (
        lower.includes('pick up') ||
        lower.includes('pickup') ||
        lower.includes('pick-up') ||
        lower.includes('hilux') ||
        lower.includes('navara') ||
        lower.includes('ranger') ||
        lower.includes('d-max') ||
        lower.includes('dmax')
    ) {
        return 'Pick-up';
    }

    // 3. Vans
    if (
        lower.includes('van') ||
        lower.includes('hiace') ||
        lower.includes('urvan') ||
        lower.includes('alphard') ||
        lower.includes('starex') ||
        lower.includes('commuter') ||
        lower.includes('travis')
    ) {
        return 'Van';
    }

    // 4. SUVs
    if (
        lower.includes('suv') ||
        lower.includes('fortuner') ||
        lower.includes('montero') ||
        lower.includes('everest') ||
        lower.includes('terra') ||
        lower.includes('pajero') ||
        lower.includes('prado') ||
        lower.includes('land cruiser')
    ) {
        return 'SUV';
    }

    // 5. MPV / AUV
    if (
        lower.includes('mpv') ||
        lower.includes('mvp') ||
        lower.includes('auv') ||
        lower.includes('innova') ||
        lower.includes('ertiga') ||
        lower.includes('veloz') ||
        lower.includes('avanza') ||
        lower.includes('xpander') ||
        lower.includes('x-pander') ||
        lower.includes('crosswind') ||
        lower.includes('adventure') ||
        lower.includes('l300') ||
        lower.includes('livina') ||
        lower.includes('crossover') ||
        lower.includes('cuv')
    ) {
        return 'MPV / AUV';
    }

    // 6. Hatchback / Compact
    if (
        lower.includes('hatchback') ||
        lower.includes('compact') ||
        lower.includes('wigo') ||
        lower.includes('brio') ||
        lower.includes('yaris') ||
        lower.includes('swift')
    ) {
        return 'Hatchback / Compact';
    }

    // 7. Sedans
    if (
        lower.includes('sedan') ||
        lower.includes('civic') ||
        lower.includes('vios') ||
        lower.includes('city') ||
        lower.includes('altis') ||
        lower.includes('corolla') ||
        lower.includes('mirage') ||
        lower.includes('accent') ||
        lower.includes('almera') ||
        lower.includes('changan') ||
        lower.includes('toyota')
    ) {
        return 'Sedan';
    }

    // 8. Jeep / Utility
    if (lower.includes('jeep') || lower.includes('owner') || lower.includes('wrangler')) {
        return 'Jeep / Utility';
    }

    if (lower === 'unknown' || lower === 'unspecified') {
        return 'Other';
    }

    return 'Other';
};

module.exports = {
    STANDARD_VEHICLE_CATEGORIES,
    mapToVehicleCategory
};
