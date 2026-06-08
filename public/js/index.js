import { supabase } from './supabase.js';
import { formatCurrency, setActiveNav, formatDate } from './common.js';

const totalMesEl = document.getElementById('totalMes');
const porcentajeCambioEl = document.getElementById('porcentajeCambio');
const totalHoyEl = document.getElementById('totalHoy');
const countMesEl = document.getElementById('countMes');
const categoriaTopEl = document.getElementById('categoriaTop');
const expensesListEl = document.getElementById('recentExpenses');
const noExpensesEl = document.getElementById('noExpenses');
const errorEl = document.getElementById('pageError');

async function load() {
  setActiveNav('inicio');
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    const hoy = now.toISOString().split('T')[0];

    const [{ data: gastos }, { data: gastosDelMes }, { data: gastosMesAnterior }, { data: gastosHoy }, { data: countMes }, { data: categorias }] = await Promise.all([
      supabase.from('gastos').select('*').order('fecha', { ascending: false }).limit(3),
      supabase.from('gastos').select('monto').gte('fecha', firstDay).lte('fecha', lastDay),
      supabase.from('gastos').select('monto').gte('fecha', new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()).lte('fecha', new Date(now.getFullYear(), now.getMonth(), 0).toISOString()),
      supabase.from('gastos').select('monto').gte('fecha', hoy),
      supabase.from('gastos').select('id').gte('fecha', firstDay).lte('fecha', lastDay),
      supabase.from('gastos').select('categoria, monto').gte('fecha', firstDay).lte('fecha', lastDay)
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

    totalMesEl.textContent = formatCurrency(totalMes);
    porcentajeCambioEl.textContent = `${Math.abs(porcentajeCambio)}% vs mes anterior`;
    totalHoyEl.textContent = `$${formatCurrency(totalHoy, 0)}`;
    countMesEl.textContent = String(countMes?.length || 0);
    categoriaTopEl.textContent = categoriaTop;

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

window.addEventListener('DOMContentLoaded', load);
