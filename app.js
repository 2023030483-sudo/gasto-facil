require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const https = require('https');
const fs = require('fs');
const os = require('os');
const { createSupabaseClient } = require('./middleware/supabase');

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'gasto-facil-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(async (req, res, next) => {
  try {
    if (!req.session.supabaseSession) {
      const supabaseClient = createSupabaseClient();
      const { data, error } = await supabaseClient.auth.signInAnonymously();
      if (error) {
        return next(error);
      }

      req.session.supabaseSession = data.session;
      req.session.user_id = data.user?.id || null;
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Routes
app.use('/', require('./routes/index'));
app.use('/gastos', require('./routes/gastos'));
app.use('/escanear', require('./routes/escanear'));
app.use('/resumen', require('./routes/resumen'));
app.use('/api', require('./routes/api'));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Página no encontrada' });
});

// HTTPS if certificates are available, otherwise fallback to HTTP
const keyPath = `${ip}+2-key.pem`;
const certPath = `${ip}+2.pem`;

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const credentials = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };

  https.createServer(credentials, app).listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Gasto Fácil corriendo en HTTPS:`);
    console.log(`   Local:   https://localhost:${PORT}`);
    console.log(`   Red:     https://${ip}:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`🚀 Gasto Fácil corriendo en HTTP:`);
    console.log(`   Local:   http://localhost:${PORT}`);
  });
}