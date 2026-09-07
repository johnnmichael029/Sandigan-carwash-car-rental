wb/**
 * Migration: seedServiceDescriptions.js
 * One-time script that populates the `description` field for existing
 * services and add-ons in the Pricing collection, based on known service names.
 * Safe to run multiple times — only updates items with empty descriptions.
 */

const PREMADE_DESCRIPTIONS = {
    // ── Core Services ──────────────────────────────────────────────────────
    'Wash': "A thorough exterior wash that removes dirt, dust, and surface grime to restore your car's shine.",
    'Engine': 'A careful engine bay cleaning that removes oil buildup, dust, and debris to keep your engine cool and looking fresh.',
    'Wax': 'A premium wax coat applied after washing to protect your paint and give it a deep, long-lasting gloss.',
    'Interior': 'A complete interior vacuuming and wipe-down of all surfaces, leaving your cabin clean and fresh.',
    'Full Detail': 'Our most comprehensive package — exterior wash, interior deep clean, wax, and engine bay cleaning all in one.',
    'Detailing': 'A meticulous hand-polish and detail service that removes minor scratches and restores your paint clarity.',

    // ── Add-ons & Extras ───────────────────────────────────────────────────
    'Buffing (1 side)': 'Single-panel machine buffing to remove swirl marks and light scratches on one side of your vehicle.',
    'Buffing (Full)': 'Full-car machine buffing to eliminate swirl marks, oxidation, and light scratches across the entire body.',
    'Acid Rain': 'A specialized treatment that neutralizes and removes water spot etching caused by acid rain or mineral deposits.',
    'Hand wax': 'A hand-applied carnauba wax finish for enhanced depth, protection, and a mirror-like shine.',
    'Hand Wax': 'A hand-applied carnauba wax finish for enhanced depth, protection, and a mirror-like shine.',
    'Armor': 'A durable polymer armor coating that protects your paint from UV rays, scratches, and environmental contaminants.',
    'Ceramic': 'Long-lasting ceramic coating that bonds with your paint to create a hydrophobic, scratch-resistant protective layer.',
    'Odor Removal': 'Deep deodorizing treatment that eliminates stubborn odors from smoke, food, or pets inside the cabin.',
    'Seat Shampooing': 'Deep-clean shampooing of fabric or leather seats to lift stains and restore freshness.',
    'Dashboard Polish': 'A UV-protective polish applied to all dashboard and interior plastic surfaces for a clean, matte finish.',
    'Tire Shine': 'A glossy dressing applied to tires that protects against cracking and gives a rich, wet-look finish.',
    'Rain Repellent': 'A hydrophobic coating applied to glass surfaces that repels rain, improving visibility in wet conditions.',
};

/**
 * Runs the description seeding migration.
 * @param {Model} PricingModel - The Mongoose Pricing model
 */
async function seedServiceDescriptions(PricingModel) {
    try {
        const allVehicles = await PricingModel.find({});
        let totalUpdated = 0;

        for (const vehicle of allVehicles) {
            let modified = false;

            for (let i = 0; i < vehicle.services.length; i++) {
                const item = vehicle.services[i];
                if (!item.description) {
                    const premade = PREMADE_DESCRIPTIONS[item.name];
                    if (premade) {
                        vehicle.services[i].description = premade;
                        modified = true;
                    }
                }
            }

            for (let i = 0; i < vehicle.addons.length; i++) {
                const item = vehicle.addons[i];
                if (!item.description) {
                    const premade = PREMADE_DESCRIPTIONS[item.name];
                    if (premade) {
                        vehicle.addons[i].description = premade;
                        modified = true;
                    }
                }
            }

            if (modified) {
                vehicle.markModified('services');
                vehicle.markModified('addons');
                await vehicle.save();
                totalUpdated++;
            }
        }

        if (totalUpdated > 0) {
            console.log(`✅ [MIGRATION] Seeded service descriptions for ${totalUpdated} vehicle pricing record(s).`);
        }
    } catch (err) {
        console.warn(`⚠️  [MIGRATION] seedServiceDescriptions failed: ${err.message}`);
    }
}

module.exports = seedServiceDescriptions;
