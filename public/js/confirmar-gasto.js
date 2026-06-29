import { supabase, initSupabaseSession } from './supabase.js';
import { setActiveNav, getTicketData, clearTicketData } from './common.js';

async function refreshBudgetAlertsSafely(userId, options = {}) {
  try {
    const { refreshBudgetAlerts } = await import('./presupuesto-utils.js?v=monthly-budget-fix-12');
    await refreshBudgetAlerts(supabase, userId, options);
  } catch (error) {
    console.warn('No se pudieron actualizar los avisos del presupuesto:', error);
  }
}


const form = document.getElementById('confirmForm');
const messageEl = document.getElementById('confirmMessage');

function loadTicketData() {
  const datos = getTicketData();
  if (!datos) {
    window.location.href = '/escanear/';
    return;
  }

  document.querySelector('input[name="monto"]').value = datos.monto || 0;
  document.querySelector('input[name="establecimiento"]').value = datos.establecimiento || '';
  document.querySelector('input[name="concepto"]').value = datos.concepto || '';
  document.querySelector('input[name="fecha"]').value = datos.fecha || new Date().toISOString().split('T')[0];
  document.querySelector('select[name="categoria"]').value = datos.categoria || 'Otros';
  document.querySelector('select[name="metodo_pago"]').value = datos.metodo_pago || 'Efectivo';
  document.querySelector('textarea[name="notas"]').value = datos.notas || 'Escaneado desde ticket';
}

async function handleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(form);
  const payload = {
    concepto: formData.get('concepto'),
    monto: parseFloat(formData.get('monto')) || 0,
    fecha: formData.get('fecha'),
    categoria: formData.get('categoria'),
    metodo_pago: formData.get('metodo_pago'),
    notas: formData.get('notas'),
    establecimiento: formData.get('establecimiento')
  };

  try {
    const userId = await initSupabaseSession();
    const { error } = await supabase.from('gastos').insert([{
      concepto: payload.concepto || payload.establecimiento,
      monto: payload.monto,
      fecha: payload.fecha,
      categoria: payload.categoria,
      metodo_pago: payload.metodo_pago,
      notas: payload.notas || 'Escaneado desde ticket',
      user_id: userId,
      created_at: new Date().toISOString()
    }]);

    if (error) throw error;
    await refreshBudgetAlertsSafely(userId);
    clearTicketData();
    window.location.href = '/gastos/';
  } catch (err) {
    messageEl.textContent = err.message || 'No se pudo guardar el gasto';
    messageEl.style.display = 'block';
  }
}

function load() {
  setActiveNav('escanear');
  if (!form) return;
  form.addEventListener('submit', handleSubmit);
  loadTicketData();
}

window.addEventListener('DOMContentLoaded', load);
