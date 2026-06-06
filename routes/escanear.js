const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', (req, res) => {
  res.render('escanear', {
    title: 'Escanear Ticket',
    activePage: 'escanear'
  });
});

router.get('/confirmar', (req, res) => {
  const datos = req.session.datosIA;
  if (!datos) return res.redirect('/escanear');
  res.render('confirmar-gasto', {
    title: 'Confirmar Gasto',
    activePage: 'escanear',
    datos
  });
});

router.post('/confirmar', async (req, res) => {
  const supabase = require('../middleware/supabase');
  try {
    const { concepto, monto, fecha, categoria, metodo_pago, notas, establecimiento } = req.body;
    const { error } = await supabase.from('gastos').insert([{
      concepto: concepto || establecimiento,
      monto: parseFloat(monto),
      fecha,
      categoria,
      metodo_pago: metodo_pago || 'Efectivo',
      notas: notas || 'Escaneado desde ticket',
      created_at: new Date().toISOString()
    }]);
    if (error) throw error;
    req.session.datosIA = null;
    res.redirect('/gastos');
  } catch (err) {
    res.redirect('/escanear');
  }
});

module.exports = router;
