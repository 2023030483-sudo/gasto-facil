const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('presupuesto', {
    title: 'Presupuesto',
    activePage: 'presupuesto'
  });
});

module.exports = router;
