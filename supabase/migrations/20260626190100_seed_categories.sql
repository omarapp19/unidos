-- ===========================================================================
-- Semilla de categorías principales de insumos para centros de acopio.
-- Lista base (no exhaustiva); idempotente vía ON CONFLICT sobre el nombre.
-- ===========================================================================

-- Requiere nombre único para que el upsert sea idempotente.
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_key ON public.categories (name);

INSERT INTO public.categories (name, unit) VALUES
  ('Alimentos no perecederos', 'kg'),
  ('Agua potable',             'litros'),
  ('Medicamentos',             'unidades'),
  ('Ropa y calzado',           'unidades'),
  ('Kits de higiene personal', 'kits'),
  ('Mantas y cobijas',         'unidades'),
  ('Refugios y carpas',        'unidades'),
  ('Pañales',                  'paquetes'),
  ('Herramientas',             'unidades'),
  ('Productos de limpieza',    'unidades'),
  ('Alimento para mascotas',   'kg'),
  ('Artículos para bebés',     'unidades')
ON CONFLICT (name) DO NOTHING;
