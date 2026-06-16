import { supabase, initSupabaseSession } from './supabase.js';
import { formatCurrency, formatDate, setActiveNav } from './common.js';

const listContainer = document.getElementById('expensesList');
const emptyState = document.getElementById('emptyState');
const errorEl = document.getElementById('pageError');

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

function renderExpenseItem(gasto) {
  const category = gasto.categoria || 'Otros';
  return `
    <div class="expense-item expense-item--full">
      <div class="expense-item__icon expense-item__icon--${category.toLowerCase().replace(/\s/g, '-')}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
      </div>
      <div class="expense-item__info">
        <div class="expense-item__row">
          <span class="expense-item__name">${gasto.concepto}</span>
          <span class="expense-item__amount">$${formatCurrency(gasto.monto)}</span>
        </div>
        <div class="expense-item__row">
          <span class="category-badge category-badge--${category.toLowerCase().replace(/\s/g, '-')}" style="text-transform:none">${category}</span>
          <span class="expense-item__date">${formatDate(gasto.fecha)}</span>
        </div>
      </div>
      <div class="expense-actions">
        <a href="/gastos/${gasto.id}/editar" class="btn-edit" title="Editar gasto">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
        </a>
        <button class="btn-delete" data-id="${gasto.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>`;
}

async function load() {
  setActiveNav('gastos');
  const categoria = getQueryParam('categoria') || 'Todos';
  const busqueda = getQueryParam('busqueda') || '';
  document.querySelectorAll('.filter-btn').forEach(element => {
    if (element.dataset.category === categoria) {
      element.classList.add('filter-btn--active');
    }
  });
  document.querySelector('input[name="busqueda"]').value = busqueda;

  try {
    const userId = await initSupabaseSession();
    let query = supabase.from('gastos').select('*').eq('user_id', userId).order('fecha', { ascending: false });
    if (categoria && categoria !== 'Todos') {
      query = query.eq('categoria', categoria);
    }
    if (busqueda) {
      query = query.ilike('concepto', `%${busqueda}%`);
    }
    const { data: gastos, error } = await query;
    if (error) throw error;

    if (!gastos || gastos.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    listContainer.innerHTML = gastos.map(g => renderExpenseItem(g)).join('');
    attachDeleteListeners();
  } catch (error) {
    errorEl.textContent = error.message || 'Error al cargar tus gastos';
    errorEl.style.display = 'block';
  }
}

function attachDeleteListeners() {
  document.querySelectorAll('.btn-delete').forEach(button => {
    button.addEventListener('click', async event => {
      const id = event.currentTarget.dataset.id;
      if (!id || !confirm('¿Eliminar este gasto?')) return;
      try {
        const userId = await initSupabaseSession();
        await supabase.from('gastos').delete().eq('id', id).eq('user_id', userId);
        window.location.reload();
      } catch (err) {
        alert('No se pudo eliminar el gasto. Intenta de nuevo.');
      }
    });
  });
}

window.addEventListener('DOMContentLoaded', load);
