-- Migration to drop NOT NULL constraints on optional contact and social fields in centers table.
-- Restores compatibility with the register_center and admin_register_center RPCs when fields are left blank.

alter table "public"."centers" alter column "email" drop not null;
alter table "public"."centers" alter column "instagram" drop not null;
alter table "public"."centers" alter column "phone" drop not null;
alter table "public"."centers" alter column "website" drop not null;
alter table "public"."centers" alter column "whatsapp" drop not null;

-- Permite a ciudadanos sugerir centros (insertar) de forma pública,
-- pero obliga a que se creen desaprobados (is_approved = false) por seguridad.
DROP POLICY IF EXISTS "Sugerencia pública de centros" ON public.centers;
CREATE POLICY "Sugerencia pública de centros"
  ON public.centers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (is_approved = false);

