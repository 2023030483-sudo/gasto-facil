const express = require('express');
const router = express.Router();
const { createSupabaseClient } = require('../middleware/supabase');

function getSupabaseClient(req) {
  return createSupabaseClient(req.session.supabaseSession);
}

router.get('/', async (req, res) => {
  try {
    const supabase = getSupabaseClient(req);
    const userId = req.session?.user_id;

    // Obtener gastos recientes
    const { data: gastos, error } = await supabase
      .from('gastos')
      .select('*')
      .eq('user_id', userId)
      .order('fecha', { ascending: false })
      .limit(3);

    // Total del mes actual
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

    const { data: gastosDelMes } = await supabase
      .from('gastos')
      .select('monto')
      .eq('user_id', userId)
      .gte('fecha', firstDay)
      .lte('fecha', lastDay);

    const totalMes = gastosDelMes ? gastosDelMes.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0) : 0;

    // Total del mes anterior
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const firstDayPrev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDayPrev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

    const { data: gastosMesAnterior } = await supabase
      .from('gastos')
      .select('monto')
      .eq('user_id', userId)
      .gte('fecha', firstDayPrev)
      .lte('fecha', lastDayPrev);

    const totalMesAnterior = gastosMesAnterior ? gastosMesAnterior.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0) : 0;
    const porcentajeCambio = totalMesAnterior > 0 ? (((totalMes - totalMesAnterior) / totalMesAnterior) * 100).toFixed(0) : 0;

    // Gastos de hoy
    const hoy = new Date().toISOString().split('T')[0];
    const { data: gastosHoy } = await supabase
      .from('gastos')
      .select('monto')
      .eq('user_id', userId)
      .gte('fecha', hoy);

    const totalHoy = gastosHoy ? gastosHoy.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0) : 0;

    // Total gastos del mes (count)
    const { data: countMes } = await supabase
      .from('gastos')
      .select('id')
      .eq('user_id', userId)
      .gte('fecha', firstDay)
      .lte('fecha', lastDay);

    // Categoría top
    const { data: categorias } = await supabase
      .from('gastos')
      .select('categoria, monto')
      .eq('user_id', userId)
      .gte('fecha', firstDay)
      .lte('fecha', lastDay);

    let categoriaTop = 'Comida';
    if (categorias && categorias.length > 0) {
      const catMap = {};
      categorias.forEach(g => {
        catMap[g.categoria] = (catMap[g.categoria] || 0) + parseFloat(g.monto || 0);
      });
      categoriaTop = Object.keys(catMap).reduce((a, b) => catMap[a] > catMap[b] ? a : b, 'Comida');
    }

    // Totales por mes (agrupar por año-mes)
    const { data: allGastos } = await supabase
      .from('gastos')
      .select('monto, fecha')
      .eq('user_id', userId)
      .order('fecha', { ascending: false });

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

    res.render('index', {
      title: 'Inicio',
      activePage: 'inicio',
      gastos: gastos || [],
      totalMes,
      porcentajeCambio,
      totalHoy,
      countMes: countMes ? countMes.length : 0,
      categoriaTop,
      monthlyTotals,
      error: error ? error.message : null
    });
  } catch (err) {
    res.render('index', {
      title: 'Inicio',
      activePage: 'inicio',
      gastos: [],
      totalMes: 0,
      porcentajeCambio: 0,
      totalHoy: 0,
      countMes: 0,
      categoriaTop: 'Comida',
      error: err.message
    });
  }
});

module.exports = router;
