const { createClient } = require('@supabase/supabase-js');

function assertSupabaseConfig(config) {
    const url = config.supabaseUrl;
    const key = config.supabaseSecretKey;

    if (!url || !key) {
        throw new Error(
            'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SECRET_KEY '
            + 'in .env or .env.{BOT_ENV}.',
        );
    }

    return { url, key };
}

function createSupabaseClient(config) {
    const { url, key } = assertSupabaseConfig(config);

    return createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

module.exports = { createSupabaseClient };
