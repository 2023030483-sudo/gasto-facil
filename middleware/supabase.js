const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  SUPABASE_URL y SUPABASE_ANON_KEY no están configurados en .env');
}

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
);

function createSupabaseClient(session = null) {
  const client = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder-key',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );

  if (session?.access_token || session?.refresh_token) {
    client.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
  }

  return client;
}

module.exports = { supabase, createSupabaseClient };
