import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUserId = null;
let initPromise = null;

export async function initSupabaseSession() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const localSession = await supabase.auth.getSession();
    if (localSession?.data?.session?.user?.id) {
      currentUserId = localSession.data.session.user.id;
      return currentUserId;
    }

    const response = await fetch('/api/session');
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.session) {
      await supabase.auth.setSession(body.session);
      currentUserId = body.user_id || body.session.user?.id || null;
      return currentUserId;
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      throw new Error(error.message || 'No se pudo iniciar sesión anónima en Supabase');
    }
    currentUserId = data.user?.id || null;
    return currentUserId;
  })();

  return initPromise;
}

export function getCurrentUserId() {
  return currentUserId;
}
