-- ═══════════════════════════════════════
-- GASTO FÁCIL — Supabase Schema
-- Ejecuta esto en el SQL Editor de Supabase
-- ═══════════════════════════════════════

-- Tabla principal de gastos
CREATE TABLE IF NOT EXISTS gastos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  concepto    TEXT NOT NULL,
  monto       DECIMAL(10,2) NOT NULL DEFAULT 0,
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria   TEXT DEFAULT 'Otros',
  metodo_pago TEXT DEFAULT 'Efectivo',
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos(categoria);

-- RLS: permitir acceso público (ajusta según tus necesidades de auth)
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON gastos
  FOR ALL USING (true) WITH CHECK (true);

-- Datos de ejemplo
INSERT INTO gastos (concepto, monto, fecha, categoria, metodo_pago, notas) VALUES
  ('Compra en OXXO',        85.00,  CURRENT_DATE,       'Comida',      'Efectivo',      'Refresco y botana'),
  ('Transporte en taxi',    150.00, CURRENT_DATE - 1,   'Transporte',  'Efectivo',      NULL),
  ('Comida en cafetería',   120.00, CURRENT_DATE - 2,   'Comida',      'Tarjeta',       NULL),
  ('Pago de internet',      600.00, CURRENT_DATE - 3,   'Servicios',   'Transferencia', 'Mensualidad Telmex'),
  ('Compra en farmacia',    230.00, CURRENT_DATE - 4,   'Salud',       'Tarjeta',       'Medicamentos');
