import { supabase, initSupabaseSession } from './supabase.js';
import { formatCurrency, setActiveNav } from './common.js';
import {
  clearBudgetNotifications,
  deleteMonthlyBudget,
  getBudgetNotifications,
  getMonthLabel,
  getMonthlyBudget,
  refreshBudgetAlerts,
  removeBudgetNotificationsForMonth,
  requestDeviceNotificationPermission,
  resetBudgetTracking,
  showBudgetDeviceNotification,
  saveMonthlyBudget
} from './presupuesto-utils.js';

const elements = {
  setupCard: document.getElementById('budgetSetupCard'),
  summaryCard: document.getElementById('budgetSummaryCard'),
  form: document.getElementById('budgetForm'),
  amountInput: document.getElementById('budgetAmount'),
  formTitle: document.getElementById('budgetFormTitle'),
  formText: document.getElementById('budgetFormText'),
  saveButton: document.getElementById('budgetSaveButton'),
  cancelButton: document.getElementById('budgetCancelButton'),
  editButton: document.getElementById('budgetEditButton'),
  deleteButton: document.getElementById('budgetDeleteButton'),
  notificationsList: document.getElementById('budgetNotificationsList'),
  notificationsEmpty: document.getElementById('budgetNotificationsEmpty'),
  clearNotificationsButton: document.getElementById('clearBudgetNotifications'),
  enableNotificationsButton: document.getElementById('enableDeviceNotifications'),
  message: document.getElementById('budgetMessage'),
  pageError: document.getElementById('pageError'),
  monthLabel: document.getElementById('budgetMonthLabel'),
  budgetValue: document.getElementById('budgetValue'),
  spentValue: document.getElementById('budgetSpent'),
  remainingValue: document.getElementById('budgetRemaining'),
  percentValue: document.getElementById('budgetPercent'),
  progressFill: document.getElementById('budgetProgressFill'),
  budgetStatus: document.getElementById('budgetStatus')
};

let userId = null;
let currentSpent = 0;
let editing = false;
let refreshInProgress = false;

function setVisible(element, visible) {
  if (!element) return;
  if (visible) element.removeAttribute('hidden');
  else element.setAttribute('hidden', '');
}

function setMessage(message = '', type = '') {
  if (!elements.message) return;
  elements.message.textContent = message;
  elements.message.classList.remove('budget-message--error', 'budget-message--success');
  if (type) elements.message.classList.add(`budget-message--${type}`);
}

function showPageError(message = '') {
  if (!elements.pageError) return;
  elements.pageError.textContent = message;
  elements.pageError.style.display = message ? 'block' : 'none';
}

function setLoading(isLoading) {
  if (elements.saveButton) {
    elements.saveButton.disabled = isLoading;
    elements.saveButton.textContent = isLoading
      ? 'Guardando…'
      : (editing ? 'Actualizar presupuesto' : 'Guardar presupuesto');
  }
  if (elements.amountInput) elements.amountInput.disabled = isLoading;
}

function openEditor({ isEdit = false } = {}) {
  editing = isEdit;
  const currentBudget = getMonthlyBudget(userId);

  setVisible(elements.setupCard, true);
  setVisible(elements.summaryCard, false);
  showPageError();

  elements.formTitle.textContent = isEdit
    ? 'Modificar presupuesto mensual'
    : '¿Cuál es el monto mensual que quieres gastar?';
  elements.formText.textContent = isEdit
    ? `Cambia el límite para ${getMonthLabel()}. Los gastos de otros meses no se suman.`
    : 'Define una cantidad. Al comenzar un mes nuevo, el gasto utilizado vuelve a cero automáticamente.';

  elements.saveButton.textContent = isEdit ? 'Actualizar presupuesto' : 'Guardar presupuesto';
  setVisible(elements.cancelButton, isEdit);
  elements.amountInput.disabled = false;
  elements.amountInput.value = isEdit && currentBudget ? String(currentBudget) : '';
  setMessage();

  window.setTimeout(() => {
    elements.amountInput?.focus();
    elements.amountInput?.select();
    elements.setupCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}

function closeEditor() {
  editing = false;
  setVisible(elements.setupCard, false);
  setVisible(elements.summaryCard, true);
  setVisible(elements.cancelButton, false);
  setMessage();
}

function renderSummary() {
  const budget = getMonthlyBudget(userId);
  if (!budget) {
    openEditor({ isEdit: false });
    return;
  }

  closeEditor();

  const remaining = budget - currentSpent;
  const percent = budget > 0 ? (currentSpent / budget) * 100 : 0;

  if (elements.monthLabel) {
    elements.monthLabel.textContent = `PRESUPUESTO DE ${getMonthLabel().toUpperCase()}`;
  }
  elements.budgetValue.textContent = `$${formatCurrency(budget)}`;
  elements.spentValue.textContent = `$${formatCurrency(currentSpent)}`;
  elements.remainingValue.textContent = `${remaining < 0 ? '-' : ''}$${formatCurrency(Math.abs(remaining))}`;
  elements.remainingValue.classList.toggle('budget-stat__value--negative', remaining < 0);
  elements.remainingValue.classList.toggle('budget-stat__value--positive', remaining >= 0);
  elements.percentValue.textContent = `${Math.round(percent)}% utilizado`;
  elements.progressFill.style.width = `${Math.min(Math.max(percent, 0), 100)}%`;
  elements.progressFill.classList.toggle('budget-progress__fill--warning', percent >= 70 && percent < 100);
  elements.progressFill.classList.toggle('budget-progress__fill--danger', percent >= 100);

  if (remaining < 0) {
    elements.budgetStatus.textContent = `Has superado el límite de este mes por $${formatCurrency(Math.abs(remaining))}.`;
    elements.budgetStatus.className = 'budget-status budget-status--danger';
  } else if (percent >= 95) {
    elements.budgetStatus.textContent = `Te quedan $${formatCurrency(remaining)} disponibles en ${getMonthLabel()}.`;
    elements.budgetStatus.className = 'budget-status budget-status--warning';
  } else {
    elements.budgetStatus.textContent = `Te quedan $${formatCurrency(remaining)} disponibles en ${getMonthLabel()}.`;
    elements.budgetStatus.className = 'budget-status';
  }
}

function notificationIcon(type) {
  if (type === 'over-budget') {
    return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  }
  return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';
}

function formatNotificationDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-MX', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

function renderNotifications() {
  const notifications = getBudgetNotifications(userId);
  const hasNotifications = notifications.length > 0;

  setVisible(elements.notificationsEmpty, !hasNotifications);
  setVisible(elements.clearNotificationsButton, hasNotifications);

  elements.notificationsList.innerHTML = notifications.map(notification => `
    <article class="budget-notification ${notification.type === 'over-budget' ? 'budget-notification--danger' : ''}">
      <div class="budget-notification__icon" aria-hidden="true">${notificationIcon(notification.type)}</div>
      <div class="budget-notification__content">
        <div class="budget-notification__header">
          <h3>${notification.title}</h3>
          <time>${formatNotificationDate(notification.updatedAt || notification.createdAt)}</time>
        </div>
        <p>${notification.message}</p>
      </div>
    </article>
  `).join('');
}

function updateNotificationPermissionButton() {
  const button = elements.enableNotificationsButton;
  if (!button) return;

  if (!('Notification' in window)) {
    setVisible(button, false);
    return;
  }

  setVisible(button, Notification.permission !== 'granted');
  button.textContent = Notification.permission === 'denied'
    ? 'Avisos del dispositivo bloqueados'
    : 'Activar avisos del dispositivo';
  button.disabled = Notification.permission === 'denied';
}

async function refreshData({ notifyDevice = true } = {}) {
  if (!userId || refreshInProgress) return;

  refreshInProgress = true;
  try {
    const result = await refreshBudgetAlerts(supabase, userId, { notifyDevice, date: new Date() });
    currentSpent = result.spent;
    renderSummary();
    renderNotifications();
  } finally {
    refreshInProgress = false;
  }
}

async function handleSave(event) {
  event.preventDefault();
  const amount = Number(elements.amountInput.value);

  if (!Number.isFinite(amount) || amount <= 0) {
    setMessage('Escribe una cantidad mayor a cero.', 'error');
    elements.amountInput.focus();
    return;
  }

  setLoading(true);
  setMessage();

  try {
    saveMonthlyBudget(userId, amount);
    resetBudgetTracking(userId);
    removeBudgetNotificationsForMonth(userId);
    await refreshData({ notifyDevice: false });
    elements.budgetStatus.textContent = `Presupuesto actualizado a $${formatCurrency(amount)} para cada mes.`;
    elements.budgetStatus.className = 'budget-status';
  } catch (error) {
    openEditor({ isEdit: editing });
    setMessage(error.message || 'No se pudo guardar el presupuesto.', 'error');
  } finally {
    setLoading(false);
  }
}

function handleEdit(event) {
  event.preventDefault();
  event.stopPropagation();
  openEditor({ isEdit: true });
}

function handleDelete(event) {
  event.preventDefault();
  if (!confirm('¿Eliminar tu presupuesto mensual? También se borrarán los avisos del mes actual.')) return;

  deleteMonthlyBudget(userId);
  renderNotifications();
  openEditor({ isEdit: false });
  setMessage('El presupuesto fue eliminado. Puedes registrar uno nuevo.', 'success');
}

async function handleEnableNotifications() {
  const permission = await requestDeviceNotificationPermission();
  updateNotificationPermissionButton();

  if (permission === 'granted') {
    showPageError();

    // Permite comprobar el permiso con el mismo texto que aparece dentro de la app.
    const latestNotification = getBudgetNotifications(userId)[0];
    if (latestNotification) {
      await showBudgetDeviceNotification(
        latestNotification.title,
        latestNotification.message,
        `manual-${latestNotification.id}`
      );
    } else {
      await showBudgetDeviceNotification(
        'Avisos de presupuesto activados',
        'Recibirás una notificación cuando alcances los límites de tu presupuesto mensual.',
        'permission-enabled'
      );
    }
  } else if (permission === 'denied') {
    showPageError('El navegador bloqueó los avisos. Puedes habilitarlos desde los permisos del sitio.');
  }
}

function bindEvents() {
  elements.form?.addEventListener('submit', handleSave);
  elements.editButton?.addEventListener('click', handleEdit);
  elements.cancelButton?.addEventListener('click', event => {
    event.preventDefault();
    renderSummary();
  });
  elements.deleteButton?.addEventListener('click', handleDelete);
  elements.clearNotificationsButton?.addEventListener('click', event => {
    event.preventDefault();
    clearBudgetNotifications(userId);
    renderNotifications();
  });
  elements.enableNotificationsButton?.addEventListener('click', handleEnableNotifications);
}

async function load() {
  setActiveNav('presupuesto');
  updateNotificationPermissionButton();
  bindEvents();

  try {
    userId = await initSupabaseSession();
    if (!userId) return;
    await refreshData({ notifyDevice: true });
  } catch (error) {
    showPageError(error.message || 'No se pudo cargar el presupuesto.');
  }
}

window.addEventListener('DOMContentLoaded', load);

// Si la aplicación permanece abierta durante el cambio de mes o vuelve desde
// segundo plano, vuelve a calcular únicamente los gastos del mes actual.
window.addEventListener('pageshow', () => {
  if (userId && !editing) void refreshData({ notifyDevice: true });
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && userId && !editing) {
    void refreshData({ notifyDevice: true });
  }
});

window.setInterval(() => {
  if (document.visibilityState === 'visible' && userId && !editing) {
    void refreshData({ notifyDevice: true });
  }
}, 60 * 1000);