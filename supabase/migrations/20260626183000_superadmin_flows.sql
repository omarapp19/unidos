-- ===========================================================================
-- Flujos de superadmin: arregla la política de categorías (faltaba WITH CHECK,
-- bloqueaba INSERT), permite a superadmin ELIMINAR centros (rechazar huérfanos)
-- y añade el RPC para registrar centros huérfanos ya aprobados sin crear admin.
-- ===========================================================================

-- 1. Categorías: superadmin puede INSERT/UPDATE/DELETE -----------------------
--    La política previa solo tenía USING (no aplica a INSERT) → alta bloqueada.
DROP POLICY IF EXISTS "Solo superadmins modifican categorías" ON public.categories;

CREATE POLICY "Solo superadmins modifican categorías"
  ON public.categories
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = 'superadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p
                      WHERE p.id = auth.uid() AND p.role = 'superadmin'));

-- 2. Rechazar centro = eliminarlo (solo superadmin) --------------------------
DROP POLICY IF EXISTS "Superadmins eliminan centros" ON public.centers;

CREATE POLICY "Superadmins eliminan centros"
  ON public.centers
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = 'superadmin'));

-- 3. Alta de centro huérfano por superadmin (ya aprobado, sin admin) ----------
--    SECURITY DEFINER: salta la política de INSERT (que fuerza is_approved=false)
--    pero verifica el rol y no crea perfil ni asigna usuario.
CREATE OR REPLACE FUNCTION public.admin_register_center(
  p_name text, p_organization text, p_address text, p_schedule text,
  p_phone text, p_whatsapp text, p_instagram text, p_website text, p_email text,
  p_lat double precision, p_lng double precision,
  p_is_approved boolean DEFAULT true,
  p_is_verified boolean DEFAULT false
) RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
DECLARE
  v_center_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Solo un superadmin puede registrar centros';
  END IF;

  INSERT INTO public.centers
    (name, organization, address, schedule, phone, whatsapp, instagram,
     website, email, lat, lng, is_approved, is_verified)
  VALUES
    (btrim(p_name), btrim(p_organization), btrim(p_address), btrim(p_schedule),
     NULLIF(btrim(p_phone), ''), NULLIF(btrim(p_whatsapp), ''),
     NULLIF(btrim(p_instagram), ''), NULLIF(btrim(p_website), ''),
     NULLIF(btrim(p_email), ''), COALESCE(p_lat, 0), COALESCE(p_lng, 0),
     p_is_approved, p_is_verified)
  RETURNING id INTO v_center_id;

  RETURN v_center_id;
END;
$$;

ALTER FUNCTION public.admin_register_center(
  text, text, text, text, text, text, text, text, text,
  double precision, double precision, boolean, boolean
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.admin_register_center(
  text, text, text, text, text, text, text, text, text,
  double precision, double precision, boolean, boolean
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_register_center(
  text, text, text, text, text, text, text, text, text,
  double precision, double precision, boolean, boolean
) TO authenticated;
