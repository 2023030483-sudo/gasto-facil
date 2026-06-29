import { formatCurrency } from './common.js';

export const BUDGET_THRESHOLDS = [50, 70, 80, 90, 95, 100];

const BUDGET_PREFIX = 'gastoFacilMonthlyBudget';
const TRACKING_PREFIX = 'gastoFacilBudgetTracking';
const NOTIFICATIONS_PREFIX = 'gastoFacilBudgetNotifications';
const MAX_NOTIFICATIONS = 30;

function normalizedUserId(userId) {
  return String(userId || 'local-user');
}

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthLabel(date = new Date()) {
  return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}

export function getCurrentMonthRange(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDayNumber = new Date(year, month + 1, 0).getDate();
  const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayNumber).padStart(2, '0')}`;
  return { firstDay, lastDay, monthKey: getMonthKey(date) };
}

// El límite se conserva de un mes a otro. Lo que se reinicia automáticamente
// es la suma de gastos, porque siempre se consulta únicamente el mes actual.
function budgetKey(userId) {
  return `${BUDGET_PREFIX}:${normalizedUserId(userId)}`;
}

function trackingKey(userId, monthKey = getMonthKey()) {
  return `${TRACKING_PREFIX}:${normalizedUserId(userId)}:${monthKey}`;
}

function notificationsKey(userId) {
  return `${NOTIFICATIONS_PREFIX}:${normalizedUserId(userId)}`;
}

export function getMonthlyBudget(userId) {
  const raw = localStorage.getItem(budgetKey(userId));
  if (!raw) return null;

  // Compatibilidad con versiones que guardaron solamente el número.
  const directValue = Number(raw);
  if (Number.isFinite(directValue) && directValue > 0) return directValue;

  // Compatibilidad por si una versión futura/anterior guardó un objeto.
  const record = readJson(budgetKey(userId), null);
  const objectValue = Number(record?.amount);
  return Number.isFinite(objectValue) && objectValue > 0 ? objectValue : null;
}

export function saveMonthlyBudget(userId, amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Escribe un monto mensual mayor a cero.');
  }

  localStorage.setItem(budgetKey(userId), String(value));
  return value;
}

export function deleteMonthlyBudget(userId) {
  localStorage.removeItem(budgetKey(userId));
  resetBudgetTracking(userId);
  removeBudgetNotificationsForMonth(userId);
}

export function getBudgetNotifications(userId) {
  const notifications = readJson(notificationsKey(userId), []);
  return Array.isArray(notifications)
    ? notifications.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    : [];
}

function saveNotifications(userId, notifications) {
  writeJson(notificationsKey(userId), notifications.slice(0, MAX_NOTIFICATIONS));
}

function upsertNotification(userId, notification) {
  const notifications = getBudgetNotifications(userId);
  const existingIndex = notifications.findIndex(item => item.id === notification.id);

  if (existingIndex >= 0) {
    notifications[existingIndex] = {
      ...notifications[existingIndex],
      ...notification,
      createdAt: notifications[existingIndex].createdAt || notification.createdAt,
      updatedAt: new Date().toISOString()
    };
  } else {
    notifications.unshift({
      ...notification,
      createdAt: notification.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  notifications.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  saveNotifications(userId, notifications);
}

export function clearBudgetNotifications(userId) {
  localStorage.removeItem(notificationsKey(userId));
}

export function removeBudgetNotificationsForMonth(userId, monthKey = getMonthKey()) {
  const filtered = getBudgetNotifications(userId).filter(item => item.monthKey !== monthKey);
  saveNotifications(userId, filtered);
}

export function resetBudgetTracking(userId, monthKey = getMonthKey()) {
  localStorage.removeItem(trackingKey(userId, monthKey));
}

function getTrackingState(userId, monthKey) {
  const state = readJson(trackingKey(userId, monthKey), { reached: [], lastOverspend: 0 });
  return {
    reached: Array.isArray(state.reached) ? state.reached.map(Number).filter(Number.isFinite) : [],
    lastOverspend: Number(state.lastOverspend) || 0
  };
}

function saveTrackingState(userId, monthKey, state) {
  writeJson(trackingKey(userId, monthKey), state);
}

function thresholdMessage(threshold, budget, spent) {
  if (threshold === 100) {
    return `Has alcanzado el 100% de tu presupuesto mensual de $${formatCurrency(budget)}.`;
  }

  return `Has utilizado el ${threshold}% de tu presupuesto mensual. Llevas $${formatCurrency(spent)} de $${formatCurrency(budget)}.`;
}

function overspendMessage(budget, spent) {
  const overspend = spent - budget;
  return `Has superado tu presupuesto mensual por $${formatCurrency(overspend)}. Tu límite era de $${formatCurrency(budget)} y llevas gastados $${formatCurrency(spent)}.`;
}

export async function showBudgetDeviceNotification(title, body, tag = getMonthKey()) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;

  const options = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `gasto-facil-presupuesto-${tag}`,
    renotify: true,
    vibrate: [180, 80, 180],
    data: { url: '/presupuesto/' }
  };

  try {
    // En Android/Chrome las notificaciones deben mostrarse desde el Service Worker.
    // El constructor new Notification() no funciona de forma confiable en móviles.
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration?.showNotification) {
        await registration.showNotification(title, options);
        return true;
      }
    }

    // Respaldo para navegadores de escritorio.
    new Notification(title, options);
    return true;
  } catch (error) {
    console.warn('No se pudo mostrar la notificación del presupuesto:', error?.message || error);
    return false;
  }
}

export async function requestDeviceNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';

  let permission = Notification.permission;
  if (permission !== 'granted') {
    permission = await Notification.requestPermission();
  }

  if (permission === 'granted' && 'serviceWorker' in navigator) {
    let registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      registration = await navigator.serviceWorker.register('/service-worker.js');
    }
    await navigator.serviceWorker.ready;
  }

  return permission;
}

export function evaluateBudgetAlerts(userId, spentAmount, { notifyDevice = true, date = new Date() } = {}) {
  const budget = getMonthlyBudget(userId);
  const spent = Math.max(0, Number(spentAmount) || 0);
  if (!budget) return [];

  const { monthKey } = getCurrentMonthRange(date);
  const percent = (spent / budget) * 100;
  const state = getTrackingState(userId, monthKey);
  const created = [];

  // Si se elimina un gasto y baja el porcentaje, permite volver a avisar al alcanzar el nivel.
  state.reached = state.reached.filter(threshold => threshold <= percent);

  for (const threshold of BUDGET_THRESHOLDS.filter(value => value < 100)) {
    if (percent >= threshold && !state.reached.includes(threshold)) {
      const message = thresholdMessage(threshold, budget, spent);
      const notification = {
        id: `${monthKey}-threshold-${threshold}`,
        monthKey,
        type: 'threshold',
        threshold,
        title: `Presupuesto al ${threshold}%`,
        message
      };
      upsertNotification(userId, notification);
      state.reached.push(threshold);
      created.push(notification);
      if (notifyDevice) void showBudgetDeviceNotification(notification.title, message, notification.id);
    }
  }

  if (percent >= 100) {
    const overspend = Math.max(0, spent - budget);

    if (overspend > 0) {
      const message = overspendMessage(budget, spent);
      const notification = {
        id: `${monthKey}-over-budget`,
        monthKey,
        type: 'over-budget',
        threshold: 100,
        title: 'Presupuesto superado',
        message
      };
      const overspendChanged = overspend > state.lastOverspend + 0.009;
      const notificationExists = getBudgetNotifications(userId).some(item => item.id === notification.id);

      if (!notificationExists || !state.reached.includes(100) || overspendChanged) {
        upsertNotification(userId, notification);
      }

      if (!state.reached.includes(100) || overspendChanged) {
        created.push(notification);
        if (notifyDevice) void showBudgetDeviceNotification(notification.title, message, notification.id);
      }

      state.lastOverspend = overspend;
    } else if (!state.reached.includes(100)) {
      const message = thresholdMessage(100, budget, spent);
      const notification = {
        id: `${monthKey}-threshold-100`,
        monthKey,
        type: 'threshold',
        threshold: 100,
        title: 'Presupuesto al 100%',
        message
      };
      upsertNotification(userId, notification);
      created.push(notification);
      if (notifyDevice) void showBudgetDeviceNotification(notification.title, message, notification.id);
    }

    if (!state.reached.includes(100)) state.reached.push(100);
  } else {
    state.lastOverspend = 0;
  }

  state.reached = [...new Set(state.reached)].sort((a, b) => a - b);
  saveTrackingState(userId, monthKey, state);
  return created;
}

export async function getMonthSpent(supabase, userId, date = new Date()) {
  const { firstDay, lastDay } = getCurrentMonthRange(date);
  const { data, error } = await supabase
    .from('gastos')
    .select('monto')
    .eq('user_id', userId)
    .gte('fecha', firstDay)
    .lte('fecha', lastDay);

  if (error) throw error;
  return (data || []).reduce((sum, item) => sum + Number(item.monto || 0), 0);
}

export async function getCurrentMonthSpent(supabase, userId) {
  return getMonthSpent(supabase, userId, new Date());
}

export async function refreshBudgetAlerts(supabase, userId, options = {}) {
  const date = options.date || new Date();
  const spent = await getMonthSpent(supabase, userId, date);
  const notifications = evaluateBudgetAlerts(userId, spent, { ...options, date });
  return { spent, notifications, budget: getMonthlyBudget(userId), monthKey: getMonthKey(date) };
}