-- ===========================================================================
-- Tabla de insumos críticos más necesitados (PRD/Requerimiento adicional).
-- Permite a los superadmins definir qué insumos se muestran en el banner público.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "public"."needed_supplies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL UNIQUE,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "needed_supplies_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."needed_supplies" OWNER TO "postgres";

-- Habilitar RLS
ALTER TABLE "public"."needed_supplies" ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS:
-- 1. Lectura pública (cualquier visitante, anon o authenticated)
CREATE POLICY "Lectura pública de insumos necesitados"
  ON "public"."needed_supplies"
  FOR SELECT
  USING (true);

-- 2. Modificaciones (INSERT, UPDATE, DELETE) solo para autenticados con rol 'superadmin'
CREATE POLICY "Gestión completa de insumos para superadmins"
  ON "public"."needed_supplies"
  FOR ALL
  TO "authenticated"
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'superadmin'
    )
  );

-- Insertar ejemplos por defecto de forma segura
INSERT INTO "public"."needed_supplies" ("name")
VALUES 
  ('Insumos médicos'),
  ('Ampollas'),
  ('Tabletas')
ON CONFLICT ("name") DO NOTHING;
