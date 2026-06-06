const express = require('express');
const router = express.Router();
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Analizar ticket con IA (Anthropic API)
router.post('/analizar-ticket', upload.single('ticket'), async (req, res) => {
  try {
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada' });
    }

    let imageData = null;
    let mediaType = 'image/jpeg';

    if (req.file) {
      imageData = req.file.buffer.toString('base64');
      mediaType = req.file.mimetype;
    } else if (req.body.imageBase64) {
      const parts = req.body.imageBase64.split(',');
      imageData = parts[1] || parts[0];
      const match = parts[0].match(/data:([^;]+);/);
      if (match) mediaType = match[1];
    }

    if (!imageData) {
      return res.status(400).json({ error: 'No se recibió imagen' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageData }
            },
            {
              type: 'text',
              text: `Analiza este ticket/recibo y extrae la información. Responde ÚNICAMENTE con JSON válido, sin explicaciones ni markdown, con este formato exacto:
{
  "establecimiento": "nombre del negocio",
  "concepto": "descripción breve de lo comprado",
  "monto": 123.45,
  "fecha": "YYYY-MM-DD",
  "categoria": "una de: Comida, Transporte, Servicios, Salud, Entretenimiento, Otros",
  "notas": "detalles adicionales relevantes"
}
Si no puedes leer algún campo, usa valores razonables o null.`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      return res.status(500).json({ error: errData.error?.message || 'Error de API' });
    }

    const data = await response.json();
    const textContent = data.content.find(c => c.type === 'text');
    if (!textContent) return res.status(500).json({ error: 'Respuesta vacía de IA' });

    let parsed;
    try {
      const clean = textContent.text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return res.status(500).json({ error: 'No se pudo parsear la respuesta de IA', raw: textContent.text });
    }

    // Guardar en sesión para confirmar
    req.session.datosIA = {
      ...parsed,
      monto: parsed.monto || 0,
      fecha: parsed.fecha || new Date().toISOString().split('T')[0],
      categoria: parsed.categoria || 'Otros',
      metodo_pago: 'Efectivo',
      notas: parsed.notas || 'Escaneado desde ticket'
    };

    res.json({ ok: true, datos: req.session.datosIA });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
