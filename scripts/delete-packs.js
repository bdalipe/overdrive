const { loadEnv } = require('../src/shared/config');
const { createSupabaseClient } = require('../src/shared/supabase');
const { createRepositories } = require('../src/repositories');
const { createServices } = require('../src/services');
const { snapshotPack } = require('../src/services/pack-import');
const {
    buildPackCatalogDeleteEvent,
    resolveMaintainerActorId,
} = require('../src/services/config-change-events');
const logger = require('../src/shared/logger');
const { logBotCacheRefreshHint } = require('./lib/bot-cache-hint');
const { logConfigChangeAfterDelete } = require('./lib/audit-after-delete');

function parseSlugs(argv) {
    const flagIndex = argv.indexOf('--slugs');

    if (flagIndex === -1) {
        return null;
    }

    const raw = argv[flagIndex + 1];

    if (!raw) {
        throw new Error('Usage: npm run delete-packs -- --slugs test-pack,classic-jdm');
    }

    const slugs = raw
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

    if (slugs.length === 0) {
        throw new Error('Provide at least one pack slug with --slugs');
    }

    return slugs;
}

async function main() {
    const slugs = parseSlugs(process.argv.slice(2));

    if (!slugs) {
        throw new Error('Usage: npm run delete-packs -- --slugs test-pack,classic-jdm');
    }

    const config = loadEnv();
    const supabase = createSupabaseClient(config);
    const repositories = createRepositories(supabase);
    const services = createServices(repositories);
    const actorId = resolveMaintainerActorId(config);

    const deleted = [];

    for (const slug of slugs) {
        const existing = await repositories.packs.findBySlug(slug);

        if (!existing) {
            logger.warn('delete_packs_not_found', { slug });
            continue;
        }

        if (existing.is_default) {
            throw new Error(`Cannot delete the default pack (slug: ${slug})`);
        }

        const before = await snapshotPack(repositories.packs, existing.id);
        const removed = await repositories.packs.deleteById(existing.id);

        if (!removed) {
            continue;
        }

        services.packs.invalidatePackConfig(existing.id, {
            isDefault: Boolean(existing.is_default),
        });

        try {
            await logConfigChangeAfterDelete(
                repositories.configChanges,
                buildPackCatalogDeleteEvent({
                    actorId,
                    packId: existing.id,
                    packSlug: existing.slug,
                    before,
                }),
                {
                    summary: `pack ${existing.slug} (${existing.id})`,
                    entityType: 'pack',
                    packId: existing.id,
                    packSlug: existing.slug,
                },
            );
        } catch (error) {
            logger.error('delete_packs_partial', {
                deletedSoFar: deleted,
                failedSlug: existing.slug,
                error: error.message,
            });
            throw error;
        }

        deleted.push({ packId: existing.id, packSlug: existing.slug });
    }

    if (deleted.length > 0) {
        logBotCacheRefreshHint(logger, { scope: 'delete-packs', affected: 'pack-config' });
    }

    logger.info('delete_packs_complete', {
        botEnv: config.botEnv,
        requested: slugs.length,
        deleted: deleted.length,
        packs: deleted,
    });
}

main().catch((error) => {
    logger.error('delete_packs_failed', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});
