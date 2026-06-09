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
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
    const hoy = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const firstDayPrev = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDayPrev = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-${String(new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

    const [{ data: gastos }, { data: gastosDelMes }, { data: gastosMesAnterior }, { data: gastosHoy }, { data: countMes }, { data: categorias }, { data: allGastos }] = await Promise.all([
      supabase.from('gastos').select('*').order('fecha', { ascending: false }).limit(3),
      // gastosDelMes, gastosMesAnterior, etc. are fetched below
      supabase.from('gastos').select('monto').gte('fecha', firstDay).lte('fecha', lastDay),
      supabase.from('gastos').select('monto').gte('fecha', firstDayPrev).lte('fecha', lastDayPrev),
      supabase.from('gastos').select('monto').gte('fecha', hoy),
      supabase.from('gastos').select('id').gte('fecha', firstDay).lte('fecha', lastDay),
      supabase.from('gastos').select('categoria, monto').gte('fecha', firstDay).lte('fecha', lastDay),
      supabase.from('gastos').select('monto, fecha').order('fecha', { ascending: false })
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

    // Insert formatted amount into structured spans
    if (totalMesEl) {
      const formatted = formatCurrency(totalMes, 2); // e.g. "4,500.00"
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

    // Render monthly totals (client-side)
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

window.addEventListener('DOMContentLoaded', load);
