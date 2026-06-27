/* ===========================================================================
   Recursos de Ayuda Humanitaria
   Tablas: help_categories (categorías) y help_links (enlaces por categoría).
   Gestionadas desde el panel de superadmin → /admin/super/recursos
   =========================================================================== */

-- ── Categorías ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS help_categories (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;

-- Lectura pública (landing y páginas de ayuda)
DROP POLICY IF EXISTS "public_read_help_categories" ON help_categories;
CREATE POLICY "public_read_help_categories"
  ON help_categories FOR SELECT
  USING (true);

-- Solo superadmin puede escribir
DROP POLICY IF EXISTS "superadmin_write_help_categories" ON help_categories;
CREATE POLICY "superadmin_write_help_categories"
  ON help_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

-- ── Enlaces ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS help_links (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid        NOT NULL REFERENCES help_categories(id) ON DELETE CASCADE,
  label       text        NOT NULL,
  description text,
  href        text        NOT NULL,
  sort_order  integer     DEFAULT 0 NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE help_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_help_links" ON help_links;
CREATE POLICY "public_read_help_links"
  ON help_links FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "superadmin_write_help_links" ON help_links;
CREATE POLICY "superadmin_write_help_links"
  ON help_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

-- ── Seed: categorías predefinidas ─────────────────────────────────────────────

INSERT INTO help_categories (name) VALUES
  ('Desaparecidos'),
  ('Reportes de daños'),
  ('Donativos'),
  ('Personal de ayuda'),
  ('Puntos de ayuda')
ON CONFLICT (name) DO NOTHING;

-- ── Seed: enlaces iniciales para "Desaparecidos" ─────────────────────────────

DO $$
DECLARE
  cat_id uuid;
BEGIN
  SELECT id INTO cat_id FROM help_categories WHERE name = 'Desaparecidos' LIMIT 1;
  IF cat_id IS NOT NULL THEN
    INSERT INTO help_links (category_id, label, description, href, sort_order) VALUES
      (cat_id, 'Desaparecidos Venezuela',
       'Plataforma ciudadana para reportar y buscar personas desaparecidas tras los terremotos del 24 de junio de 2026. Más de 40.000 reportes activos.',
       'https://www.desaparecidosvenezuela.com/', 1),
      (cat_id, 'CICR – Restoring Family Links (Cruz Roja Venezuela)',
       'Sistema internacional de la Cruz Roja para reencontrarse con familiares separados por el desastre.',
       'https://familylinks.icrc.org/organization/venezuelan-red-cross', 2),
      (cat_id, 'Cruz Roja Venezolana',
       'Asistencia y protección a personas afectadas por desastres. Canal oficial para solicitar búsqueda de familiares.',
       'https://cruzroja.ve/', 3),
      (cat_id, 'ACNUR Venezuela',
       'Canal de la Agencia de la ONU para Refugiados con información de emergencia y asistencia humanitaria.',
       'https://help.unhcr.org/venezuela/', 4),
      (cat_id, 'PROVEA – Derechos Humanos',
       'Organización venezolana con seguimiento y registro de casos de personas desaparecidas.',
       'https://provea.org/', 5),
      (cat_id, 'Foro Penal',
       'Registro de detenidos y desaparecidos en Venezuela. Asistencia legal gratuita a las personas afectadas.',
       'https://foropenal.com/', 6),
      (cat_id, 'Situación Venezuela – Portal ACNUR',
       'Datos operacionales y canales de ayuda de la ONU para la emergencia en Venezuela.',
       'https://data.unhcr.org/en/situations/vensit', 7),
      (cat_id, 'CICR en Venezuela',
       'Presencia y operaciones del Comité Internacional de la Cruz Roja en el país.',
       'https://www.icrc.org/en/where-we-work/venezuela', 8)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
