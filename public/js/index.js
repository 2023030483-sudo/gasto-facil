import { supabase, initSupabaseSession } from './supabase.js';
import { formatCurrency, setActiveNav, formatDate } from './common.js';

const authScreen = document.getElementById('authScreen');
const appShell = document.getElementById('appShell');
const authForm = document.getElementById('authForm');
const emailInput = document.getElementById('authEmail');
const passwordInput = document.getElementById('authPassword');
const loginButton = document.getElementById('loginButton');
const registerButton = document.getElementById('registerButton');
const guestButton = document.getElementById('guestButton');
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

function setAuthMessage(message = '', type = '') {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.classList.remove('auth-message--error', 'auth-message--success');
  if (type) authMessage.classList.add(`auth-message--${type}`);
}

function setAuthLoading(isLoading, activeButton = null) {
  [loginButton, registerButton, guestButton].forEach(button => {
    if (button) button.disabled = isLoading;
  });

  if (loginButton) loginButton.textContent = activeButton === 'login' ? 'Ingresando…' : 'Iniciar sesión';
  if (registerButton) registerButton.textContent = activeButton === 'register' ? 'Creando cuenta…' : 'Crear una cuenta';
  if (guestButton) guestButton.textContent = activeButton === 'guest' ? 'Ingresando…' : 'Continuar como invitado';
}

function translateAuthError(error) {
  const message = String(error?.message || 'No fue posible completar la operación.');
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials')) return 'El correo o la contraseña no son correctos.';
  if (lower.includes('email not confirmed')) return 'Primero confirma tu correo electrónico.';
  if (lower.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (lower.includes('user already registered')) return 'Ya existe una cuenta con ese correo.';
  if (lower.includes('anonymous sign-ins are disabled')) return 'El acceso como invitado está desactivado en Supabase.';
  return message;
}

function validateCredentials() {
  const email = emailInput?.value.trim() || '';
  const password = passwordInput?.value || '';

  if (!email || !password) {
    setAuthMessage('Escribe tu correo y contraseña.', 'error');
    return null;
  }

  if (!emailInput.checkValidity()) {
    setAuthMessage('Escribe un correo electrónico válido.', 'error');
    return null;
  }

  if (password.length < 6) {
    setAuthMessage('La contraseña debe tener al menos 6 caracteres.', 'error');
    return null;
  }

  return { email, password };
}

function showAuthScreen() {
  if (appShell) appShell.hidden = true;
  if (authScreen) authScreen.hidden = false;
  document.title = 'Iniciar sesión — Gasto Fácil';
}

async function showDashboard() {
  if (authScreen) authScreen.hidden = true;
  if (appShell) appShell.hidden = false;
  document.title = 'Inicio — Gasto Fácil';

  if (!dashboardStarted) {
    dashboardStarted = true;
    await loadDashboard();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const credentials = validateCredentials();
  if (!credentials) return;

  setAuthMessage();
  setAuthLoading(true, 'login');

  try {
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw error;
    localStorage.removeItem(GUEST_ACCESS_KEY);
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
    const { data, error } = await supabase.auth.signUp(credentials);
    if (error) throw error;

    localStorage.removeItem(GUEST_ACCESS_KEY);

    if (data.session) {
      await showDashboard();
      return;
    }

    setAuthMessage('Cuenta creada. Revisa tu correo para confirmarla y después inicia sesión.', 'success');
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
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    localStorage.setItem(GUEST_ACCESS_KEY, 'true');
    await showDashboard();
  } catch (error) {
    setAuthMessage(translateAuthError(error), 'error');
  } finally {
    setAuthLoading(false);
  }
}

async function bootstrapAuth() {
  showAuthScreen();

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const session = data?.session;
    if (!session) return;

    const isAnonymous = Boolean(session.user?.is_anonymous);
    const guestWasChosen = localStorage.getItem(GUEST_ACCESS_KEY) === 'true';

    // Las sesiones anónimas antiguas se cierran para que el nuevo login sí aparezca.
    if (isAnonymous && !guestWasChosen) {
      await supabase.auth.signOut();
      return;
    }

    await showDashboard();
  } catch (error) {
    setAuthMessage(translateAuthError(error), 'error');
  }
}

async function loadDashboard() {
  setActiveNav('inicio');
  try {
    const userId = await initSupabaseSession();
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
window.addEventListener('DOMContentLoaded', bootstrapAuth);