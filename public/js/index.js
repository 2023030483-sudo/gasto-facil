import { supabase } from './supabase.js';
import { formatCurrency, setActiveNav, formatDate } from './common.js';

const authScreen = document.getElementById('authScreen');
const appShell = document.getElementById('appShell');
const authForm = document.getElementById('authForm');
const emailInput = document.getElementById('authEmail');
const passwordInput = document.getElementById('authPassword');
const loginButton = document.getElementById('loginButton');
const registerButton = document.getElementById('registerButton');
const guestButton = document.getElementById('guestButton');
const logoutButton = document.getElementById('logoutButton');
const authMessage = document.getElementById('authMessage');

const totalMesEl = document.getElementById('totalMes');
const porcentajeCambioEl = document.getElementById('porcentajeCambio');
const totalHoyEl = document.getElementById('totalHoy');
const countMesEl = document.getElementById('countMes');
const categoriaTopEl = document.getElementById('categoriaTop');
const expensesListEl = document.getElementById('recentExpenses');
const noExpensesEl = document.getElementById('noExpenses');
const errorEl = document.getElementById('pageError');

const GUEST_ACCESS_KEY = 'gastoFacilGuestAccess';
let dashboardStarted = false;


async function updateBudgetAlertsSafely(userId, totalMes) {
  try {
    const { evaluateBudgetAlerts } = await import('./presupuesto-utils.js?v=monthly-budget-fix-12');
    evaluateBudgetAlerts(userId, totalMes, { notifyDevice: true });
  } catch (error) {
    // El presupuesto es complementario: nunca debe bloquear el login ni el inicio.
    console.warn('No se pudieron actualizar los avisos del presupuesto:', error);
  }
}

const buttonDefaults = new Map(
  [loginButton, registerButton, guestButton]
    .filter(Boolean)
    .map(button => [button, button.innerHTML])
);

function setAuthMessage(message = '', type = '') {
  if (!authMessage) return;

  authMessage.textContent = message;
  authMessage.classList.remove('auth-message--error', 'auth-message--success');

  if (type) {
    authMessage.classList.add(`auth-message--${type}`);
  }
}

function setButtonText(button, text) {
  if (!button) return;
  button.textContent = text;
}

function restoreButton(button) {
  if (!button) return;
  const original = buttonDefaults.get(button);
  if (original) button.innerHTML = original;
}

function setAuthLoading(isLoading, activeButton = null) {
  [loginButton, registerButton, guestButton].forEach(button => {
    if (button) button.disabled = isLoading;
  });

  if (isLoading) {
    if (activeButton === 'login') setButtonText(loginButton, 'Ingresando…');
    if (activeButton === 'register') setButtonText(registerButton, 'Creando cuenta…');
    if (activeButton === 'guest') setButtonText(guestButton, 'Ingresando…');
    return;
  }

  restoreButton(loginButton);
  restoreButton(registerButton);
  restoreButton(guestButton);
}

function translateAuthError(error) {
  const message = String(error?.message || 'No fue posible completar la operación.');
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return 'El correo o la contraseña no son correctos.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Primero confirma tu correo desde el mensaje que te envió Supabase.';
  }

  if (lower.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }

  if (lower.includes('user already registered')) {
    return 'Ya existe una cuenta con ese correo.';
  }

  if (lower.includes('anonymous sign-ins are disabled')) {
    return 'El acceso como invitado está desactivado en Supabase.';
  }

  return message;
}

function validateCredentials() {
  const email = emailInput?.value.trim() || '';
  const password = passwordInput?.value || '';

  if (!email || !password) {
    setAuthMessage('Escribe tu correo y contraseña.', 'error');
    return null;
  }

  if (!emailInput?.checkValidity()) {
    setAuthMessage('Escribe un correo electrónico válido.', 'error');
    return null;
  }

  if (password.length < 6) {
    setAuthMessage('La contraseña debe tener al menos 6 caracteres.', 'error');
    return null;
  }

  return { email, password };
}

function cleanAuthUrl() {
  const hasAuthHash =
    window.location.hash.includes('access_token=') ||
    window.location.hash.includes('error=');

  const query = new URLSearchParams(window.location.search);
  const hasAuthQuery =
    query.has('code') ||
    query.has('token_hash') ||
    query.has('error') ||
    query.has('error_code') ||
    query.has('error_description');

  if (hasAuthHash || hasAuthQuery) {
    window.history.replaceState({}, document.title, `${window.location.origin}/`);
  }
}

function readAuthErrorFromUrl() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const queryParams = new URLSearchParams(window.location.search);

  const description =
    queryParams.get('error_description') ||
    hashParams.get('error_description') ||
    queryParams.get('error') ||
    hashParams.get('error');

  return description ? decodeURIComponent(description.replace(/\+/g, ' ')) : '';
}

function showAuthScreen() {
  if (appShell) {
    appShell.hidden = true;
    appShell.style.display = 'none';
  }

  if (authScreen) {
    authScreen.hidden = false;
    authScreen.style.display = '';
  }

  document.body.classList.add('auth-active');
  document.title = 'Iniciar sesión — Gasto Fácil';
}

async function showDashboard() {
  if (!appShell) {
    throw new Error('No se encontró el panel principal de la aplicación.');
  }

  if (authScreen) {
    authScreen.hidden = true;
    authScreen.style.display = 'none';
  }

  appShell.hidden = false;
  appShell.style.display = 'block';
  document.body.classList.remove('auth-active');

  document.title = 'Inicio — Gasto Fácil';
  window.scrollTo({ top: 0, behavior: 'auto' });

  if (!dashboardStarted) {
    dashboardStarted = true;

    try {
      await loadDashboard();
    } catch (error) {
      dashboardStarted = false;

      if (errorEl) {
        errorEl.textContent = error?.message || 'No se pudo cargar el tablero.';
        errorEl.style.display = 'block';
      }

      console.error('Error al cargar el tablero:', error);
    }
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const credentials = validateCredentials();
  if (!credentials) return;

  setAuthMessage();
  setAuthLoading(true, 'login');

  try {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw error;

    if (!data?.session?.user?.id) {
      throw new Error('Supabase no devolvió una sesión válida.');
    }

    localStorage.removeItem(GUEST_ACCESS_KEY);
    cleanAuthUrl();
    await showDashboard();
  } catch (error) {
    setAuthMessage(translateAuthError(error), 'error');
  } finally {
    setAuthLoading(false);
  }
}

async function handleRegister() {
  const credentials = validateCredentials();
  if (!credentials) return;

  setAuthMessage();
  setAuthLoading(true, 'register');

  try {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });

    if (error) throw error;

    localStorage.removeItem(GUEST_ACCESS_KEY);

    if (data?.session?.user?.id) {
      cleanAuthUrl();
      await showDashboard();
      return;
    }

    setAuthMessage(
      'Cuenta creada. Abre el correo de confirmación y después vuelve a iniciar sesión.',
      'success'
    );
  } catch (error) {
    setAuthMessage(translateAuthError(error), 'error');
  } finally {
    setAuthLoading(false);
  }
}

async function handleGuest() {
  setAuthMessage();
  setAuthLoading(true, 'guest');

  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;

    if (!data?.session?.user?.id) {
      throw new Error('No se pudo crear la sesión de invitado.');
    }

    localStorage.setItem(GUEST_ACCESS_KEY, 'true');
    await showDashboard();
  } catch (error) {
    setAuthMessage(translateAuthError(error), 'error');
  } finally {
    setAuthLoading(false);
  }
}

async function handleLogout() {
  if (!logoutButton) return;

  logoutButton.disabled = true;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const wasAnonymous = Boolean(sessionData?.session?.user?.is_anonymous);

    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    localStorage.removeItem(GUEST_ACCESS_KEY);
    dashboardStarted = false;

    if (authForm) authForm.reset();
    if (expensesListEl) expensesListEl.innerHTML = '';
    if (noExpensesEl) noExpensesEl.style.display = 'none';
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }

    setAuthMessage(
      wasAnonymous
        ? 'Sesión de invitado cerrada. Al entrar nuevamente se creará un invitado nuevo.'
        : 'Sesión cerrada correctamente.',
      'success'
    );

    showAuthScreen();
  } catch (error) {
    if (errorEl) {
      errorEl.textContent = translateAuthError(error);
      errorEl.style.display = 'block';
    }
  } finally {
    logoutButton.disabled = false;
  }
}

async function bootstrapAuth() {
  showAuthScreen();

  const redirectError = readAuthErrorFromUrl();
  if (redirectError) {
    setAuthMessage(redirectError, 'error');
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const session = data?.session;
    if (!session?.user?.id) return;

    const isAnonymous = Boolean(session.user.is_anonymous);
    const guestWasChosen = localStorage.getItem(GUEST_ACCESS_KEY) === 'true';

    // Evita reutilizar una sesión anónima antigua si el usuario no eligió Invitado.
    if (isAnonymous && !guestWasChosen) {
      await supabase.auth.signOut();
      return;
    }

    cleanAuthUrl();
    await showDashboard();
  } catch (error) {
    setAuthMessage(translateAuthError(error), 'error');
  }
}

async function loadDashboard() {
  setActiveNav('inicio');
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      showAuthScreen();
      throw new Error('Tu sesión no está activa. Inicia sesión nuevamente.');
    }
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
    const hoy = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const firstDayPrev = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDayPrev = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-${String(new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

    const [{ data: gastos }, { data: gastosDelMes }, { data: gastosMesAnterior }, { data: gastosHoy }, { data: countMes }, { data: categorias }, { data: allGastos }] = await Promise.all([
      supabase.from('gastos').select('*').eq('user_id', userId).order('fecha', { ascending: false }).limit(3),
      supabase.from('gastos').select('monto').eq('user_id', userId).gte('fecha', firstDay).lte('fecha', lastDay),
      supabase.from('gastos').select('monto').eq('user_id', userId).gte('fecha', firstDayPrev).lte('fecha', lastDayPrev),
      supabase.from('gastos').select('monto').eq('user_id', userId).gte('fecha', hoy),
      supabase.from('gastos').select('id').eq('user_id', userId).gte('fecha', firstDay).lte('fecha', lastDay),
      supabase.from('gastos').select('categoria, monto').eq('user_id', userId).gte('fecha', firstDay).lte('fecha', lastDay),
      supabase.from('gastos').select('monto, fecha').eq('user_id', userId).order('fecha', { ascending: false })
    ]);

    const totalMes = gastosDelMes ? gastosDelMes.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0) : 0;
    const totalMesAnterior = gastosMesAnterior ? gastosMesAnterior.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0) : 0;
    const totalHoy = gastosHoy ? gastosHoy.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0) : 0;
    await updateBudgetAlertsSafely(userId, totalMes);
    const porcentajeCambio = totalMesAnterior > 0 ? (((totalMes - totalMesAnterior) / totalMesAnterior) * 100).toFixed(0) : 0;

    const catMap = {};
    (categorias || []).forEach(g => {
      const cat = g.categoria || 'Otros';
      catMap[cat] = (catMap[cat] || 0) + parseFloat(g.monto || 0);
    });
    const categoriaTop = Object.keys(catMap).length > 0
      ? Object.keys(catMap).reduce((a, b) => catMap[a] > catMap[b] ? a : b, 'Comida')
      : 'Comida';

    if (totalMesEl) {
      const formatted = formatCurrency(totalMes, 2);
      const parts = formatted.split('.');
      const whole = parts[0] || '0';
      const cents = parts[1] || '00';
      totalMesEl.textContent = whole;
      const centsEl = totalMesEl.parentElement.querySelector('.cents');
      if (centsEl) centsEl.textContent = `.${cents}`;
    }
    porcentajeCambioEl.textContent = `${Math.abs(porcentajeCambio)}% vs mes anterior`;
    totalHoyEl.textContent = `$${formatCurrency(totalHoy, 0)}`;
    countMesEl.textContent = String(countMes?.length || 0);
    categoriaTopEl.textContent = categoriaTop;

    const monthlyTotalsEl = document.getElementById('monthlyTotals');
    if (monthlyTotalsEl) {
      const monthlyMap = {};
      (allGastos || []).forEach(g => {
        if (!g || !g.fecha) return;
        const d = new Date(g.fecha);
        if (isNaN(d)) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[key] = monthlyMap[key] || { year: d.getFullYear(), month: d.getMonth() + 1, total: 0 };
        monthlyMap[key].total += parseFloat(g.monto || 0);
      });
      const monthlyTotals = Object.values(monthlyMap)
        .sort((a, b) => (b.year - a.year) || (b.month - a.month))
        .map(m => ({
          label: new Date(m.year, m.month - 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' }),
          year: m.year,
          month: m.month,
          total: m.total
        }));

      monthlyTotalsEl.innerHTML = monthlyTotals.map(m => `
        <a href="/resumen?year=${m.year}&month=${m.month}" class="month-card" style="min-width:160px; background:#fff; border-radius:10px; padding:1rem; box-shadow:0 6px 18px rgba(0,0,0,0.06); text-decoration:none; color:inherit;">
          <div style="font-size:0.9rem; color:#6b7280; margin-bottom:0.25rem;">${m.label}</div>
          <div style="font-weight:700; font-size:1.1rem; color:#0456C5">$${formatCurrency(m.total, 2)}</div>
        </a>
      `).join('');
    }

    if (!gastos || gastos.length === 0) {
      noExpensesEl.style.display = 'block';
      return;
    }

    expensesListEl.innerHTML = gastos.map(gasto => {
      const category = gasto.categoria || 'Otros';
      return `
        <a href="/gastos/?categoria=${encodeURIComponent(category)}" class="expense-item">
          <div class="expense-item__icon expense-item__icon--${category.toLowerCase().replace(/\s/g, '-')}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
          </div>
          <div class="expense-item__info">
            <div class="expense-item__row">
              <span class="expense-item__name">${gasto.concepto || 'Gasto'}</span>
              <span class="expense-item__amount">$${formatCurrency(gasto.monto)}</span>
            </div>
            <div class="expense-item__row">
              <span class="category-badge category-badge--${category.toLowerCase().replace(/\s/g, '-')}" style="text-transform:none">${category}</span>
              <span class="expense-item__date">${formatDate(gasto.fecha)}</span>
            </div>
          </div>
        </a>`;
    }).join('');
  } catch (error) {
    errorEl.textContent = error.message || 'Error al cargar el tablero';
    errorEl.style.display = 'block';
  }
}

authForm?.addEventListener('submit', handleLogin);
registerButton?.addEventListener('click', handleRegister);
guestButton?.addEventListener('click', handleGuest);
logoutButton?.addEventListener('click', handleLogout);

supabase.auth.onAuthStateChange((event, session) => {
  window.setTimeout(() => {
    if (event === 'SIGNED_IN' && session?.user?.id) {
      cleanAuthUrl();
      showDashboard().catch(error => {
        setAuthMessage(translateAuthError(error), 'error');
      });
      return;
    }

    if (event === 'SIGNED_OUT') {
      localStorage.removeItem(GUEST_ACCESS_KEY);
      dashboardStarted = false;
      showAuthScreen();
    }
  }, 0);
});

window.addEventListener('DOMContentLoaded', bootstrapAuth);