const express = require('express');
const router = express.Router();
const supabase = require('../middleware/supabase');

router.get('/', async (req, res) => {
  try {
    // Obtener gastos recientes
    const { data: gastos, error } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(3);

    // Total del mes actual
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const { data: gastosDelMes } = await supabase
      .from('gastos')
      .select('monto')
      .gte('fecha', firstDay)
      .lte('fecha', lastDay);

    const totalMes = gastosDelMes ? gastosDelMes.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0) : 0;

    // Total del mes anterior
    const firstDayPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

    const { data: gastosMesAnterior } = await supabase
      .from('gastos')
      .select('monto')
      .gte('fecha', firstDayPrev)
      .lte('fecha', lastDayPrev);

    const totalMesAnterior = gastosMesAnterior ? gastosMesAnterior.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0) : 0;
    const porcentajeCambio = totalMesAnterior > 0 ? (((totalMes - totalMesAnterior) / totalMesAnterior) * 100).toFixed(0) : 0;

    // Gastos de hoy
    const hoy = new Date().toISOString().split('T')[0];
    const { data: gastosHoy } = await supabase
      .from('gastos')
      .select('monto')
      .gte('fecha', hoy);

    const totalHoy = gastosHoy ? gastosHoy.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0) : 0;

    // Total gastos del mes (count)
    const { data: countMes } = await supabase
      .from('gastos')
      .select('id')
      .gte('fecha', firstDay)
      .lte('fecha', lastDay);

    // Categoría top
    const { data: categorias } = await supabase
      .from('gastos')
      .select('categoria, monto')
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

    res.render('index', {
      title: 'Inicio',
      activePage: 'inicio',
      gastos: gastos || [],
      totalMes,
      porcentajeCambio,
      totalHoy,
      countMes: countMes ? countMes.length : 0,
      categoriaTop,
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
