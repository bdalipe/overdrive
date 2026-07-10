/**
 * Build append-only stats_events rows for a pack open.
 * Payload uses 6-digit packId/carId per migration 005.
 */
function buildPackOpenStatsEvents({ userId, packId, packSlug, packSize, cards }) {
    const events = [
        {
            userId,
            eventType: 'pack_open',
            payload: {
                packId,
                packSlug,
                packSize,
            },
        },
    ];

    for (let index = 0; index < cards.length; index += 1) {
        const car = cards[index];
        events.push({
            userId,
            eventType: 'pull',
            payload: {
                packId,
                carId: car.id,
                rarity: car.rarity,
                slot: index + 1,
            },
        });
    }

    return events;
}

module.exports = {
    buildPackOpenStatsEvents,
};
