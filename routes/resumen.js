const express = require('express');
const router = express.Router();
const supabase = require('../middleware/supabase');

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const firstDayPrev = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDayPrev = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-${String(new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

    const { data: gastosMes } = await supabase
      .from('gastos').select('*')
      .gte('fecha', firstDay).lte('fecha', lastDay);

    const { data: gastosPrev } = await supabase
      .from('gastos').select('monto')
      .gte('fecha', firstDayPrev).lte('fecha', lastDayPrev);

    const totalMes = gastosMes ? gastosMes.reduce((s, g) => s + parseFloat(g.monto || 0), 0) : 0;
    const totalPrev = gastosPrev ? gastosPrev.reduce((s, g) => s + parseFloat(g.monto || 0), 0) : 0;
    const porcentajeCambio = totalPrev > 0 ? (((totalMes - totalPrev) / totalPrev) * 100).toFixed(0) : 0;

    // Desglose por categoría
    const catMap = {};
    if (gastosMes) {
      gastosMes.forEach(g => {
        const cat = g.categoria || 'Otros';
        catMap[cat] = (catMap[cat] || 0) + parseFloat(g.monto || 0);
      });
    }

    const categorias = Object.entries(catMap)
      .map(([nombre, total]) => ({
        nombre,
        total,
        porcentaje: totalMes > 0 ? ((total / totalMes) * 100).toFixed(0) : 0
      }))
      .sort((a, b) => b.total - a.total);

    const categoriaTop = categorias[0] || { nombre: 'Comida', porcentaje: 0 };

    res.render('resumen', {
      title: 'Resumen',
      activePage: 'resumen',
      totalMes,
      porcentajeCambio,
      categorias,
      categoriaTop
    });
  } catch (err) {
    res.render('resumen', {
      title: 'Resumen',
      activePage: 'resumen',
      totalMes: 0,
      porcentajeCambio: 0,
      categorias: [],
      categoriaTop: { nombre: 'Comida', porcentaje: 0 },
      error: err.message
    });
  }
});

module.exports = router;
