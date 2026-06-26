-- ===========================================================================
-- Alinea el esquema con la UI (types/index.ts, CenterDetailModal, PublicHome,
-- CenterRegister). Añade columnas de contacto/redes + verificación en `centers`,
-- fija campos obligatorios y crea las políticas RLS que faltaban para las vistas
-- públicas (mapa de centros aprobados + gráfico de la red) y el auto-registro.
-- ===========================================================================

-- 1. Columnas que la UI ya consume pero la BD no tenía -----------------------
ALTER TABLE "public"."centers"
  ADD COLUMN IF NOT EXISTS "whatsapp"    "text",
  ADD COLUMN IF NOT EXISTS "instagram"   "text",
  ADD COLUMN IF NOT EXISTS "website"     "text",
  ADD COLUMN IF NOT EXISTS "email"       "text",
  ADD COLUMN IF NOT EXISTS "is_verified" boolean NOT NULL DEFAULT false;

-- 2. Campos obligatorios según el tipo Center y el formulario de registro -----
--    (rellena posibles nulos antes de imponer NOT NULL para no romper el push)
UPDATE "public"."centers" SET "schedule"     = '' WHERE "schedule"     IS NULL;
UPDATE "public"."centers" SET "organization" = '' WHERE "organization" IS NULL;

ALTER TABLE "public"."centers"
  ALTER COLUMN "schedule"     SET NOT NULL,
  ALTER COLUMN "organization" SET NOT NULL;

-- 3. Lectura pública (anon) para la vista pública sin login -------------------
--    Mapa/lista: solo centros aprobados.
CREATE POLICY "Lectura pública de centros aprobados"
  ON "public"."centers"
  FOR SELECT
  USING ("is_approved" = true);

--    Gráfico de la red: el público agrega SOLO los ítems (categoría/cantidad),
--    nunca toca `donations`, por lo que `donor_name` permanece privado.
CREATE POLICY "Lectura pública de ítems de donación"
  ON "public"."donation_items"
  FOR SELECT
  USING (true);

-- 4. Auto-registro de un centro nuevo (PRD Módulo 2) -------------------------
--    El usuario recién registrado (authenticated) inserta su centro; no puede
--    auto-aprobarse. La aprobación la hace luego un coordinador/superadmin.
CREATE POLICY "Registro de nuevo centro"
  ON "public"."centers"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ("is_approved" = false);
