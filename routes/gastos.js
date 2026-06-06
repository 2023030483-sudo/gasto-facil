const express = require('express');
const router = express.Router();
const supabase = require('../middleware/supabase');

// Lista de gastos
router.get('/', async (req, res) => {
  try {
    const { categoria, busqueda } = req.query;

    let query = supabase.from('gastos').select('*').order('fecha', { ascending: false });

    if (categoria && categoria !== 'Todos') {
      query = query.eq('categoria', categoria);
    }

    if (busqueda) {
      query = query.ilike('concepto', `%${busqueda}%`);
    }

    const { data: gastos, error } = await query;

    res.render('gastos', {
      title: 'Mis Gastos',
      activePage: 'gastos',
      gastos: gastos || [],
      categoriaActiva: categoria || 'Todos',
      busqueda: busqueda || '',
      error: error ? error.message : null
    });
  } catch (err) {
    res.render('gastos', {
      title: 'Mis Gastos',
      activePage: 'gastos',
      gastos: [],
      categoriaActiva: 'Todos',
      busqueda: '',
      error: err.message
    });
  }
});

// Nuevo gasto - form
router.get('/nuevo', (req, res) => {
  const prefill = req.session.gastoIA || {};
  req.session.gastoIA = null;
  res.render('nuevo-gasto', {
    title: 'Nuevo Gasto',
    activePage: 'gastos',
    prefill
  });
});

// Guardar nuevo gasto
router.post('/nuevo', async (req, res) => {
  try {
    const { concepto, monto, fecha, categoria, metodo_pago, notas } = req.body;

    const { error } = await supabase.from('gastos').insert([{
      concepto,
      monto: parseFloat(monto),
      fecha,
      categoria,
      metodo_pago,
      notas,
      created_at: new Date().toISOString()
    }]);

    if (error) throw error;

    res.redirect('/gastos');
  } catch (err) {
    res.render('nuevo-gasto', {
      title: 'Nuevo Gasto',
      activePage: 'gastos',
      prefill: req.body,
      error: err.message
    });
  }
});

// Eliminar gasto
router.post('/:id/eliminar', async (req, res) => {
  try {
    await supabase.from('gastos').delete().eq('id', req.params.id);
    res.redirect('/gastos');
  } catch (err) {
    res.redirect('/gastos');
  }
});

module.exports = router;
