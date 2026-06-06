require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const https = require('https');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Detectar IP local
const nets = os.networkInterfaces();
let ip = 'localhost';
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === 'IPv4' && !net.internal) ip = net.address;
  }
}

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'gasto-facil-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Routes
app.use('/', require('./routes/index'));
app.use('/gastos', require('./routes/gastos'));
app.use('/escanear', require('./routes/escanear'));
app.use('/resumen', require('./routes/resumen'));
app.use('/api', require('./routes/api'));

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Página no encontrada' });
});

// HTTPS
const credentials = {
  key: fs.readFileSync(`${ip}+2-key.pem`),
  cert: fs.readFileSync(`${ip}+2.pem`)
};

https.createServer(credentials, app).listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Gasto Fácil corriendo en:`);
  console.log(`   Local:   https://localhost:${PORT}`);
  console.log(`   Red:     https://${ip}:${PORT}`);
});