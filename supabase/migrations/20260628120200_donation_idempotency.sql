-- ===========================================================================
-- Idempotencia en el alta de donaciones (soporte de la cola offline / PWA).
--
-- La app puede reenviar una donación encolada sin conexión cuando vuelve la red.
-- Para que un reenvío no la duplique, el cliente genera un `client_uuid` que
-- viaja al RPC; la BD ignora el segundo insert con el mismo uuid y devuelve el
-- id existente.
--
--   · donations += columna `client_uuid` (UNIQUE parcial: las altas online sin
--     uuid siguen permitidas y no chocan entre sí porque NULL no es único).
--   · create_donation gana el parámetro `p_client_uuid` (default NULL para no
--     romper llamadas existentes) e inserta de forma idempotente.
-- ===========================================================================

-- 1. Columna anti-duplicado + índice único parcial ---------------------------
ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS client_uuid uuid;

CREATE UNIQUE INDEX IF NOT EXISTS donations_client_uuid_key
  ON public.donations (client_uuid)
  WHERE client_uuid IS NOT NULL;

-- 2. Reemplazo del RPC con soporte de idempotencia ---------------------------
--    Se elimina la firma de 3 argumentos para evitar ambigüedad de overloads.
DROP FUNCTION IF EXISTS "public"."create_donation"("uuid", "text", "jsonb");

CREATE OR REPLACE FUNCTION "public"."create_donation"(
  "p_center_id" "uuid",
  "p_donor_name" "text",
  "p_items" "jsonb",
  "p_client_uuid" "uuid" DEFAULT NULL
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

  -- Alta de la cabecera. Si llega un client_uuid ya visto (reenvío), el
  -- conflicto no inserta nada y devolvemos el id existente sin duplicar ítems.
  INSERT INTO public.donations (center_id, donor_name, created_by, client_uuid)
  VALUES (p_center_id, NULLIF(btrim(p_donor_name), ''), auth.uid(), p_client_uuid)
  ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO NOTHING
  RETURNING id INTO v_donation_id;

  IF v_donation_id IS NULL THEN
    -- Reenvío idempotente: la donación ya existía. Devuelve su id, sin re-insertar.
    SELECT id INTO v_donation_id
    FROM public.donations
    WHERE client_uuid = p_client_uuid;
    RETURN v_donation_id;
  END IF;

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

ALTER FUNCTION "public"."create_donation"("uuid", "text", "jsonb", "uuid") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."create_donation"("uuid", "text", "jsonb", "uuid") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."create_donation"("uuid", "text", "jsonb", "uuid") TO "authenticated";
