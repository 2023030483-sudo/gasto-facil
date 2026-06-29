import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

let currentUserId = null;
let initPromise = null;

function redirectToLogin() {
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') return;

  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  sessionStorage.setItem('gastoFacilReturnTo', returnTo);
  window.location.replace('/?login=required');
}

export async function initSupabaseSession({ redirectIfMissing = true } = {}) {
  if (currentUserId) return currentUserId;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const userId = data?.session?.user?.id || null;
    if (!userId) {
      if (redirectIfMissing) redirectToLogin();
      throw new Error('Tu sesión no está activa. Inicia sesión para continuar.');
    }

    currentUserId = userId;
    return currentUserId;
  })();

  try {
    return await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}

export function getCurrentUserId() {
  return currentUserId;
}

supabase.auth.onAuthStateChange((event, session) => {
  currentUserId = session?.user?.id || null;

  if (event === 'SIGNED_OUT') {
    initPromise = null;
  }
});
