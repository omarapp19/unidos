-- ===========================================================================
-- Estado/País por centro (filtro público estado/país).
--  · centers gana columnas `state` (estado/provincia) y `country` (default VE).
--  · Backfill: `state` = último segmento de `address` (las direcciones sembradas
--    terminan en ", <Estado>"); `country` queda 'Venezuela' (toda la semilla es VE).
--  · Editable luego desde el panel de superadmin para corregir los imperfectos.
-- ===========================================================================

-- 1. Columnas nuevas ---------------------------------------------------------
ALTER TABLE "public"."centers"
  ADD COLUMN IF NOT EXISTS "state"   "text",
  ADD COLUMN IF NOT EXISTS "country" "text" NOT NULL DEFAULT 'Venezuela';

-- 2. Backfill del estado desde la dirección (solo filas sin estado y con coma).
--    split_part con índice negativo (-1) toma el último segmento (PG14+).
UPDATE "public"."centers"
SET "state" = NULLIF(trim(split_part("address", ',', -1)), '')
WHERE "state" IS NULL
  AND position(',' IN "address") > 0;

-- 2b. Normaliza países: los centros internacionales traían el país como último
--     segmento, por lo que cayó en `state`. Lo movemos a `country` y dejamos
--     `state` en NULL (no tenemos su región subnacional de forma fiable).
UPDATE "public"."centers"
SET "country" = "state",
    "state"   = NULL
WHERE "state" IN (
  'Argentina','Brasil','Chile','Colombia','Ecuador','España','Estados Unidos',
  'Guatemala','México','Panamá','Paraguay','Perú','Portugal',
  'República Dominicana','Uruguay'
);

-- 2c. Filas cuyo último segmento era 'Venezuela' (país, no estado).
UPDATE "public"."centers"
SET "state" = NULL
WHERE "state" = 'Venezuela';

-- 3. Índice para los filtros país/estado de la vista pública -----------------
CREATE INDEX IF NOT EXISTS "centers_country_state_idx"
  ON "public"."centers" ("country", "state");
