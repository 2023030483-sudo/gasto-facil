const express = require('express');
const router = express.Router();
const { createSupabaseClient } = require('../middleware/supabase');

function getSupabaseClient(req) {
  return createSupabaseClient(req.session.supabaseSession);
}

function getCurrentUserId(req) {
  return req.session?.user_id || null;
}

// Lista de gastos
router.get('/', async (req, res) => {
  try {
    const { categoria, busqueda } = req.query;

    const userId = getCurrentUserId(req);
    const supabase = getSupabaseClient(req);
    let query = supabase.from('gastos').select('*').eq('user_id', userId).order('fecha', { ascending: false });

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

    const userId = getCurrentUserId(req);
    const supabase = getSupabaseClient(req);

    const { error } = await supabase.from('gastos').insert([{
      concepto,
      monto: parseFloat(monto),
      fecha,
      categoria,
      metodo_pago,
      notas,
      user_id: userId,
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

// Editar gasto - form
router.get('/:id/editar', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const supabase = getSupabaseClient(req);
    const { data, error } = await supabase.from('gastos').select('*').eq('id', req.params.id).eq('user_id', userId).limit(1);
    if (error) throw error;
    const gasto = data?.[0];
    if (!gasto) return res.redirect('/gastos');

    res.render('editar-gasto', {
      title: 'Editar Gasto',
      activePage: 'gastos',
      prefill: gasto,
      gastoId: req.params.id
    });
  } catch (err) {
    res.redirect('/gastos');
  }
});

router.post('/:id/editar', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const supabase = getSupabaseClient(req);
    const { concepto, monto, fecha, categoria, metodo_pago, notas } = req.body;
    const { error } = await supabase.from('gastos').update({
      concepto,
      monto: parseFloat(monto),
      fecha,
      categoria,
      metodo_pago,
      notas
    }).eq('id', req.params.id).eq('user_id', userId);

    if (error) throw error;
    res.redirect('/gastos');
  } catch (err) {
    res.render('editar-gasto', {
      title: 'Editar Gasto',
      activePage: 'gastos',
      prefill: req.body,
      gastoId: req.params.id,
      error: err.message
    });
  }
});

// Eliminar gasto
router.post('/:id/eliminar', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const supabase = getSupabaseClient(req);
    await supabase.from('gastos').delete().eq('id', req.params.id).eq('user_id', userId);
    res.redirect('/gastos');
  } catch (err) {
    res.redirect('/gastos');
  }
});

module.exports = router;
