-- ===========================================================================
-- Estado/País por centro (filtro público estado/país).
--  · centers gana columnas `state` (entidad federal / estado) y `country`
--    (default 'Venezuela').
--  · Backfill ESTRICTO desde el último segmento de `address`: solo se asigna
--    cuando coincide exactamente con un país conocido o con una entidad federal
--    de Venezuela (lista oficial). Si no coincide, se deja NULL — no se adivina.
--  · Editable luego desde el panel de superadmin.
-- ===========================================================================

-- 1. Columnas nuevas ---------------------------------------------------------
ALTER TABLE "public"."centers"
  ADD COLUMN IF NOT EXISTS "state"   "text",
  ADD COLUMN IF NOT EXISTS "country" "text" NOT NULL DEFAULT 'Venezuela';

-- 2. País: último segmento == nombre de país conocido (centros internacionales).
UPDATE "public"."centers" c
SET "country" = m.canonical, "state" = NULL
FROM (VALUES
  ('argentina','Argentina'),('brasil','Brasil'),('chile','Chile'),
  ('colombia','Colombia'),('ecuador','Ecuador'),('españa','España'),
  ('estados unidos','Estados Unidos'),('guatemala','Guatemala'),
  ('méxico','México'),('mexico','México'),('panamá','Panamá'),('panama','Panamá'),
  ('paraguay','Paraguay'),('perú','Perú'),('peru','Perú'),('portugal','Portugal'),
  ('república dominicana','República Dominicana'),('republica dominicana','República Dominicana'),
  ('uruguay','Uruguay'),('venezuela','Venezuela')
) AS m(alias, canonical)
WHERE position(',' IN c."address") > 0
  AND lower(trim(split_part(c."address", ',', -1))) = m.alias;

-- 3. Estado: último segmento == entidad federal de Venezuela (coincidencia exacta;
--    se aceptan variantes sin acento y abreviaturas usuales). Solo sobre centros VE.
UPDATE "public"."centers" c
SET "state" = m.canonical
FROM (VALUES
  ('amazonas','Amazonas'),
  ('anzoátegui','Anzoátegui'),('anzoategui','Anzoátegui'),
  ('apure','Apure'),('aragua','Aragua'),('barinas','Barinas'),
  ('bolívar','Bolívar'),('bolivar','Bolívar'),
  ('carabobo','Carabobo'),('cojedes','Cojedes'),
  ('delta amacuro','Delta Amacuro'),
  ('distrito capital','Distrito Capital'),('dtto capital','Distrito Capital'),
  ('distrito federal','Distrito Capital'),('caracas','Distrito Capital'),
  ('falcón','Falcón'),('falcon','Falcón'),
  ('guárico','Guárico'),('guarico','Guárico'),
  ('la guaira','La Guaira'),('vargas','La Guaira'),
  ('lara','Lara'),('mérida','Mérida'),('merida','Mérida'),
  ('miranda','Miranda'),('monagas','Monagas'),
  ('nueva esparta','Nueva Esparta'),('portuguesa','Portuguesa'),
  ('sucre','Sucre'),('táchira','Táchira'),('tachira','Táchira'),
  ('trujillo','Trujillo'),('yaracuy','Yaracuy'),('zulia','Zulia')
) AS m(alias, canonical)
WHERE c."country" = 'Venezuela'
  AND position(',' IN c."address") > 0
  AND lower(trim(split_part(c."address", ',', -1))) = m.alias;

-- 4. Índice para los filtros país/estado de la vista pública -----------------
CREATE INDEX IF NOT EXISTS "centers_country_state_idx"
  ON "public"."centers" ("country", "state");
