const fetch = global.fetch || require('node-fetch');

function normalizeAmount(rawValue) {
  if (!rawValue) return null;
  const cleaned = rawValue.replace(/[^0-9.,]/g, '').replace(/\.(?=.*\.)/g, '').replace(/,/g, '.');
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

function normalizeDate(rawDate) {
  if (!rawDate) return null;
  const cleaned = rawDate.replace(/\./g, '/').trim();
  const parts = cleaned.split(/[-/]/).map(part => part.trim());
  if (parts.length !== 3) return null;

  let year = parts[2];
  let month = parts[1];
  let day = parts[0];

  if (year.length === 2) {
    year = `20${year}`;
  }

  if (parts[0].length === 4) {
    year = parts[0];
    month = parts[1];
    day = parts[2];
  } else if (parseInt(parts[0], 10) > 12 && parseInt(parts[1], 10) <= 12) {
    day = parts[0];
    month = parts[1];
  } else if (parseInt(parts[1], 10) > 12 && parseInt(parts[0], 10) <= 12) {
    day = parts[1];
    month = parts[0];
  }

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseReceiptText(text) {
  const normalized = text.replace(/\r/g, '\n');
  const lines = normalized.split(/\n/).map(line => line.trim()).filter(Boolean);
  const raw = lines.join('\n');
  const rawLower = raw.toLowerCase();

  const establecimiento = lines[0] || 'Ticket';
  let concepto = lines.slice(1, 3).join(' - ');
  if (!concepto) concepto = `Compra en ${establecimiento}`;

  const montoMatch = raw.match(/(?:total|importe|monto|amount|a pagar|sub total|subtotal)[^\d\n]*([\d,.]+)/i)
    || raw.match(/([\d]{1,3}(?:[.,][\d]{3})*[.,][\d]{2})/);
  const monto = normalizeAmount(montoMatch?.[1] || montoMatch?.[0]);

  const dateMatch = raw.match(/(\d{4}[\-/]\d{1,2}[\-/]\d{1,2})|(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})/);
  const fecha = normalizeDate(dateMatch?.[0]) || new Date().toISOString().split('T')[0];

  const categoryKeywords = [
    { category: 'Comida', keywords: ['restaurante', 'café', 'cafe', 'pizza', 'comida', 'bar', 'burger', 'sushi'] },
    { category: 'Transporte', keywords: ['taxi', 'uber', 'didi', 'transporte', 'metro', 'autobús', 'autobus', 'bus'] },
    { category: 'Servicios', keywords: ['internet', 'luz', 'agua', 'gas', 'servicio', 'teléfono', 'telefono', 'móvil', 'movil'] },
    { category: 'Salud', keywords: ['farmacia', 'doctor', 'hospital', 'consulta', 'medicamento', 'clínica', 'clinica'] },
    { category: 'Entretenimiento', keywords: ['cine', 'cinepolis', 'teatro', 'streaming', 'spotify', 'netflix', 'bar', 'discoteca'] }
  ];

  const foundCategory = categoryKeywords.find(item => item.keywords.some(keyword => rawLower.includes(keyword)));
  const categoria = foundCategory ? foundCategory.category : 'Otros';
  const notas = lines.slice(2, 6).join(' | ') || 'Escaneado desde ticket';

  return {
    establecimiento,
    concepto,
    monto: monto || 0,
    fecha,
    categoria,
    notas
  };
}

exports.handler = async function(event) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

    if (!GEMINI_API_KEY && !GOOGLE_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No se configuró ninguna clave de IA en Netlify' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    let imageData = null;

    if (body.imageBase64) {
      const parts = body.imageBase64.split(',');
      imageData = parts[1] || parts[0];
    }

    if (!imageData) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No se recibió imagen' })
      };
    }

    let parsed;

    if (GEMINI_API_KEY) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: imageData
                    }
                  },
                  {
                    text: `Analiza este ticket/recibo y extrae la información. Responde ÚNICAMENTE con JSON válido, sin explicaciones ni markdown, con este formato exacto:\n{\n  "establecimiento": "nombre del negocio",\n  "concepto": "descripción breve de lo comprado",\n  "monto": 123.45,\n  "fecha": "YYYY-MM-DD",\n  "categoria": "una de: Comida, Transporte, Servicios, Salud, Entretenimiento, Otros",\n  "notas": "detalles adicionales relevantes"\n}\nSi no puedes leer algún campo, usa valores razonables o null.`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1024
            }
          })
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: errData?.error?.message || 'Error de API Gemini' })
        };
      }

      const data = await response.json();
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Respuesta vacía de Gemini' })
        };
      }

      try {
        parsed = JSON.parse(textContent.replace(/```json|```/g, '').trim());
      } catch (error) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'No se pudo parsear la respuesta de Gemini', raw: textContent })
        };
      }

      parsed.monto = parsed.monto || 0;
      parsed.fecha = parsed.fecha || new Date().toISOString().split('T')[0];
      parsed.categoria = parsed.categoria || 'Otros';
      parsed.notas = parsed.notas || 'Escaneado desde ticket';
    } else {
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                image: { content: imageData },
                features: [{ type: 'TEXT_DETECTION' }]
              }
            ]
          })
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: errData?.error?.message || 'Error de API de Google Vision' })
        };
      }

      const visionData = await response.json();
      const annotation = visionData.responses?.[0]?.fullTextAnnotation || visionData.responses?.[0]?.textAnnotations?.[0];
      const text = annotation?.text || annotation?.description;

      if (!text) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'No se encontró texto en la imagen' })
        };
      }

      parsed = parseReceiptText(text);
    }

    parsed.metodo_pago = 'Efectivo';

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, datos: parsed })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
