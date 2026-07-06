const {
    formatDisplayName,
    formatStat,
} = require('../models/car');

/**
 * Rarity as filled stars (1–6). Invalid rarity falls back to Unavailable label via caller fields.
 */
function formatRarityStars(rarity) {
    const n = Number(rarity);
    if (!Number.isInteger(n) || n < 1 || n > 6) {
        return 'Unavailable';
    }
    return '★'.repeat(n);
}

/**
 * Build a presentation object for pack reveal / embeds.
 * All stat strings use Unavailable / N/A rules; never raw null.
 *
 * @param {object} car - row-shaped car object
 */
function buildCardDisplay(car) {
    return {
        id: car.id,
        displayName: formatDisplayName(car),
        rarity: car.rarity,
        rarityStars: formatRarityStars(car.rarity),
        performance: formatStat(car, 'performance'),
        performanceClass: formatStat(car, 'performance_class'),
        make: formatStat(car, 'make'),
        model: formatStat(car, 'model'),
        zeroToSixty: formatStat(car, 'zero_to_sixty'),
        topSpeed: formatStat(car, 'top_speed'),
        handling: formatStat(car, 'handling'),
        weight: formatStat(car, 'weight'),
        driveType: formatStat(car, 'drive_type'),
        tyreType: formatStat(car, 'tyre_type'),
        bodyStyle: formatStat(car, 'body_style'),
        country: formatStat(car, 'country'),
        modelYear: formatStat(car, 'model_year'),
        imageUrl: car.image_url || null,
        hasImage: Boolean(car.image_url),
    };
}

/**
 * Discord embed field list for a card (text-only reveal path).
 */
function buildCardEmbedFields(car) {
    const display = buildCardDisplay(car);

    return [
        { name: 'Rarity', value: display.rarityStars, inline: true },
        { name: 'Performance', value: display.performance, inline: true },
        { name: 'Class', value: display.performanceClass, inline: true },
        { name: 'Make', value: display.make, inline: true },
        { name: 'Model', value: display.model, inline: true },
        { name: '0–60', value: display.zeroToSixty, inline: true },
        { name: 'Top speed', value: display.topSpeed, inline: true },
        { name: 'Handling', value: display.handling, inline: true },
        { name: 'Weight', value: display.weight, inline: true },
        { name: 'Drive', value: display.driveType, inline: true },
        { name: 'Tyres', value: display.tyreType, inline: true },
        { name: 'Body', value: display.bodyStyle, inline: true },
        { name: 'Country', value: display.country, inline: true },
        { name: 'Year', value: display.modelYear, inline: true },
    ];
}

module.exports = {
    formatRarityStars,
    buildCardDisplay,
    buildCardEmbedFields,
};
