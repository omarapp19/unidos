-- ===========================================================================
-- Permite a un usuario consultar el estado de SU última solicitud de reclamo
-- (sin exponer la tabla por RLS). Lo usa el login para, cuando alguien con una
-- solicitud aún pendiente intenta entrar, mostrar un mensaje claro en vez de
-- quedarse colgado (no tiene perfil/centro todavía).
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.my_latest_claim_status()
  RETURNS TABLE (status text, center_name text)
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = 'public'
  STABLE
AS $$
  SELECT cl.status,
         COALESCE(NULLIF(btrim(c.name), ''), c.organization)
  FROM public.center_claims cl
  JOIN public.centers c ON c.id = cl.center_id
  WHERE cl.user_id = auth.uid()
  ORDER BY cl.created_at DESC
  LIMIT 1;
$$;

ALTER FUNCTION public.my_latest_claim_status() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.my_latest_claim_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_latest_claim_status() TO authenticated;
