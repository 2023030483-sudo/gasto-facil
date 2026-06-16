import { supabase, initSupabaseSession } from './supabase.js';
import { setActiveNav } from './common.js';

const form = document.getElementById('expenseForm');
const messageEl = document.getElementById('formMessage');

async function handleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(form);
  const concept = formData.get('concepto');
  const monto = parseFloat(formData.get('monto')) || 0;
  const fecha = formData.get('fecha');
  const categoria = formData.get('categoria');
  const metodo_pago = formData.get('metodo_pago');
  const notas = formData.get('notas');

  try {
    const userId = await initSupabaseSession();
    const { error } = await supabase.from('gastos').insert([{
      concepto: concept,
      monto,
      fecha,
      categoria,
      metodo_pago,
      notas,
      user_id: userId,
      created_at: new Date().toISOString()
    }]);

    if (error) throw error;
    window.location.href = '/gastos/';
  } catch (err) {
    messageEl.textContent = err.message || 'No se pudo guardar el gasto';
    messageEl.style.display = 'block';
  }
}

function load() {
  setActiveNav('gastos');
  const fechaInput = document.querySelector('input[name="fecha"]');
  if (fechaInput && !fechaInput.value) {
    fechaInput.value = new Date().toISOString().split('T')[0];
  }
  form.addEventListener('submit', handleSubmit);
}

window.addEventListener('DOMContentLoaded', load);
