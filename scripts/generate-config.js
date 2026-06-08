const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const configPath = path.join(__dirname, '../public/js/config.js');

const content = `export const SUPABASE_URL = '${SUPABASE_URL}';\nexport const SUPABASE_KEY = '${SUPABASE_KEY}';\nexport const ANALYZE_FUNCTION_PATH = '/.netlify/functions/analizar-ticket';\n`;

fs.writeFileSync(configPath, content, 'utf8');
console.log(`Generated config.js at ${configPath}`);
