-- ===========================================================================
-- Amplía `register_center` (alta pública de centro + perfil) para aceptar los
-- canales de contacto que ahora recoge el formulario /registro: whatsapp,
-- instagram, website y email. Las columnas ya existen en `centers` (las usa
-- `admin_register_center`); aquí solo se actualiza el RPC.
-- Se elimina la firma anterior (8 args) y se recrea con la nueva (12 args).
-- ===========================================================================

DROP FUNCTION IF EXISTS "public"."register_center"(
  "text", "text", "text", "text", "text", double precision, double precision, "text"
);

CREATE OR REPLACE FUNCTION "public"."register_center"(
  "p_name" "text",
  "p_organization" "text",
  "p_address" "text",
  "p_schedule" "text",
  "p_phone" "text",
  "p_whatsapp" "text",
  "p_instagram" "text",
  "p_website" "text",
  "p_email" "text",
  "p_lat" double precision,
  "p_lng" double precision,
  "p_full_name" "text"
) RETURNS "uuid"
  LANGUAGE "plpgsql"
  SECURITY DEFINER
  SET "search_path" = 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_center_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para registrar un centro';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid AND center_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Este usuario ya tiene un centro asignado';
  END IF;

  INSERT INTO public.centers
    (name, organization, address, schedule, phone, whatsapp, instagram,
     website, email, lat, lng, is_approved)
  VALUES
    (btrim(p_name), btrim(p_organization), btrim(p_address), btrim(p_schedule),
     NULLIF(btrim(p_phone), ''), NULLIF(btrim(p_whatsapp), ''),
     NULLIF(btrim(p_instagram), ''), NULLIF(btrim(p_website), ''),
     NULLIF(btrim(p_email), ''), COALESCE(p_lat, 0), COALESCE(p_lng, 0), false)
  RETURNING id INTO v_center_id;

  INSERT INTO public.profiles (id, center_id, role, full_name)
  VALUES (v_uid, v_center_id, 'admin', btrim(p_full_name))
  ON CONFLICT (id) DO UPDATE
    SET center_id = EXCLUDED.center_id,
        full_name = EXCLUDED.full_name;

  RETURN v_center_id;
END;
$$;

ALTER FUNCTION "public"."register_center"(
  "text", "text", "text", "text", "text", "text", "text", "text", "text",
  double precision, double precision, "text"
) OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."register_center"(
  "text", "text", "text", "text", "text", "text", "text", "text", "text",
  double precision, double precision, "text"
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."register_center"(
  "text", "text", "text", "text", "text", "text", "text", "text", "text",
  double precision, double precision, "text"
) TO "authenticated";
