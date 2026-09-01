// ─────────────────────────────────────────────────────────
// Sandigan Carwash - Price Utils
// ─────────────────────────────────────────────────────────

/**
 * Calculate total price for a given vehicle + array of service labels.
 * Returns 0 if the vehicle is not in the price list.
 */
export function calculateTotal(vehicleType, services, priceListDict, armorAddonPrice = 100) {
    if (!priceListDict) return 0;
    const prices = priceListDict[vehicleType];
    if (!prices || !Array.isArray(services)) return 0;

    return services.reduce((sum, service) => {
        if (service === 'Armor') {
            // Armor is only available if the vehicle supports it
            return prices.Armor ? sum + armorAddonPrice : sum;
        }
        const price = prices[service];
        return sum + (typeof price === 'number' ? price : 0);
    }, 0);
}

/**
 * Get a list of services available for a given vehicle type.
 */
export function getAvailableServices(vehicleType, priceListDict) {
    if (!priceListDict) return ['Wash', 'Armor', 'Wax', 'Engine'];
    const prices = priceListDict[vehicleType];
    if (!prices) return ['Wash', 'Armor', 'Wax', 'Engine'];

    return Object.entries(prices)
        .filter(([, val]) => val !== null)
        .map(([key]) => key);
}
