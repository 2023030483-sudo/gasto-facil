const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

// Detectar IP local automáticamente
const nets = os.networkInterfaces();
let ip = 'localhost';
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      ip = net.address;
    }
  }
}

console.log(`\n🌐 IP detectada: ${ip}`);

// Verificar si ya existe certificado para esta IP
if (fs.existsSync(`${ip}+2.pem`)) {
  console.log(`✅ Certificado ya existe para ${ip}`);
  console.log(`   Ejecuta: npm run dev\n`);
  process.exit(0);
}

// Ruta explícita de mkcert en Windows
const mkcert = 'C:\\ProgramData\\chocolatey\\bin\\mkcert.exe';

console.log(`🔐 Generando certificado HTTPS para ${ip}...`);
try {
  execSync(`"${mkcert}" ${ip} localhost 127.0.0.1`, { stdio: 'inherit' });
  console.log(`\n✅ Listo! Ahora ejecuta: npm run dev`);
  console.log(`   Abre en tu celular: https://${ip}:3000\n`);
} catch (e) {
  console.error('\n❌ Error al generar certificado.');
  console.error('   Verifica que mkcert esté instalado correctamente.\n');
}