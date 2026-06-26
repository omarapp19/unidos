-- ===========================================================================
-- Funciones RPC transaccionales que la app llama desde el cliente:
--   · create_donation   — crea la donación + sus ítems en una sola operación
--                          (respeta RLS: el admin solo escribe en su centro).
--   · register_center    — crea el centro (is_approved=false) + el perfil del
--                          usuario recién registrado de forma atómica.
-- ===========================================================================

-- 1. Alta transaccional de una donación --------------------------------------
--    SECURITY INVOKER: corre con los permisos del llamante, por lo que las
--    políticas RLS de `donations`/`donation_items` siguen aplicando.
CREATE OR REPLACE FUNCTION "public"."create_donation"(
  "p_center_id" "uuid",
  "p_donor_name" "text",
  "p_items" "jsonb"
) RETURNS "uuid"
  LANGUAGE "plpgsql"
  SECURITY INVOKER
  SET "search_path" = 'public'
AS $$
DECLARE
  v_donation_id uuid;
  v_item jsonb;
  v_qty numeric;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La donación debe incluir al menos un producto';
  END IF;

  INSERT INTO public.donations (center_id, donor_name, created_by)
  VALUES (p_center_id, NULLIF(btrim(p_donor_name), ''), auth.uid())
  RETURNING id INTO v_donation_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida: %', v_item->>'quantity';
    END IF;

    INSERT INTO public.donation_items (donation_id, category_id, product, quantity)
    VALUES (
      v_donation_id,
      (v_item->>'category_id')::uuid,
      btrim(v_item->>'product'),
      v_qty
    );
  END LOOP;

  RETURN v_donation_id;
END;
$$;

ALTER FUNCTION "public"."create_donation"("uuid", "text", "jsonb") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."create_donation"("uuid", "text", "jsonb") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."create_donation"("uuid", "text", "jsonb") TO "authenticated";

-- 2. Alta transaccional de un centro + perfil --------------------------------
--    SECURITY DEFINER: necesita crear el centro y el perfil saltándose RLS,
--    pero fuerza is_approved=false y vincula el perfil a auth.uid() (no se
--    puede registrar centros para otro usuario ni autoaprobarse).
CREATE OR REPLACE FUNCTION "public"."register_center"(
  "p_name" "text",
  "p_organization" "text",
  "p_address" "text",
  "p_schedule" "text",
  "p_phone" "text",
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
    (name, organization, address, schedule, phone, lat, lng, is_approved)
  VALUES
    (btrim(p_name), btrim(p_organization), btrim(p_address), btrim(p_schedule),
     NULLIF(btrim(p_phone), ''), COALESCE(p_lat, 0), COALESCE(p_lng, 0), false)
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
  "text", "text", "text", "text", "text", double precision, double precision, "text"
) OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."register_center"(
  "text", "text", "text", "text", "text", double precision, double precision, "text"
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."register_center"(
  "text", "text", "text", "text", "text", double precision, double precision, "text"
) TO "authenticated";
