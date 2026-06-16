import { supabase, initSupabaseSession } from './supabase.js';
import { formatCurrency, setActiveNav } from './common.js';

const totalMesEl = document.getElementById('totalMes');
const porcentajeEl = document.getElementById('porcentajeCambio');
const categoriaTopNameEl = document.getElementById('categoriaTopName');
const categoriaTopPctEl = document.getElementById('categoriaTopPct');
const donutSvgContainer = document.getElementById('donutSvg');
const categoryList = document.getElementById('categoryList');
const noDataEl = document.getElementById('noData');

function buildDonutSvg(categorias) {
  const colors = ['#0456C5', '#006D3D', '#A13835', '#737785', '#D97706'];
  let offset = 0;
  const circumference = 2 * Math.PI * 80;
  return categorias.map((cat, i) => {
    const pct = parseFloat(cat.porcentaje) / 100;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const circle = `<circle cx="100" cy="100" r="80" fill="none"
      stroke="${colors[i % colors.length]}"
      stroke-width="24"
      stroke-dasharray="${dash} ${gap}"
      stroke-dashoffset="${-offset * circumference}"
      transform="rotate(-90 100 100)" />`;
    offset += pct;
    return circle;
  }).join('');
}

async function load() {
  setActiveNav('resumen');
  try {
    const userId = await initSupabaseSession();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    const firstDayPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

    const [{ data: gastosMes }, { data: gastosPrev }] = await Promise.all([
      supabase.from('gastos').select('*').eq('user_id', userId).gte('fecha', firstDay).lte('fecha', lastDay),
      supabase.from('gastos').select('monto').eq('user_id', userId).gte('fecha', firstDayPrev).lte('fecha', lastDayPrev)
    ]);

    const totalMes = (gastosMes || []).reduce((sum, g) => sum + parseFloat(g.monto || 0), 0);
    const totalPrev = (gastosPrev || []).reduce((sum, g) => sum + parseFloat(g.monto || 0), 0);
    const porcentajeCambio = totalPrev > 0 ? (((totalMes - totalPrev) / totalPrev) * 100).toFixed(0) : 0;

    const catMap = {};
    (gastosMes || []).forEach(g => {
      const cat = g.categoria || 'Otros';
      catMap[cat] = (catMap[cat] || 0) + parseFloat(g.monto || 0);
    });

    const categorias = Object.entries(catMap)
      .map(([nombre, total]) => ({
        nombre,
        total,
        porcentaje: totalMes > 0 ? ((total / totalMes) * 100).toFixed(0) : 0
      }))
      .sort((a, b) => b.total - a.total);

    totalMesEl.textContent = `$${formatCurrency(totalMes)}`;
    porcentajeEl.textContent = `${Math.abs(porcentajeCambio)}% más que el mes pasado`;

    if (categorias.length === 0) {
      noDataEl.style.display = 'block';
      categoryList.innerHTML = '';
      donutSvgContainer.innerHTML = '<circle cx="100" cy="100" r="80" fill="none" stroke="#E6E8EA" stroke-width="24" />';
      categoriaTopNameEl.textContent = 'Comida';
      categoriaTopPctEl.textContent = '0%';
      return;
    }

    const categoriaTop = categorias[0];
    categoriaTopNameEl.textContent = categoriaTop.nombre;
    categoriaTopPctEl.textContent = `${categoriaTop.porcentaje}%`;
    document.querySelector('.donut-center__pct').textContent = `${categoriaTop.porcentaje}%`;
    document.getElementById('topProgress').style.width = `${categoriaTop.porcentaje}%`;

    donutSvgContainer.innerHTML = buildDonutSvg(categorias);
    categoryList.innerHTML = categorias.map((cat, i) => {
      return `
        <div class="expense-item expense-item--cat">
          <div class="expense-item__icon" style="background: rgba(0,0,0,0.05);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 3"/></svg>
          </div>
          <div class="expense-item__info">
            <span class="expense-item__name">${cat.nombre}</span>
            <span class="expense-item__date">${cat.porcentaje}% del total</span>
          </div>
          <span class="expense-item__amount">$${formatCurrency(cat.total)}</span>
        </div>`;
    }).join('');
  } catch (error) {
    noDataEl.textContent = error.message || 'Error al cargar el resumen';
    noDataEl.style.display = 'block';
  }
}

window.addEventListener('DOMContentLoaded', load);
