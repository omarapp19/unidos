-- ===========================================================================
-- Fix: `list_center_claims` fallaba con "column reference \"id\" is ambiguous".
-- Sus columnas de salida (id, center_id, user_id, created_at) tienen el mismo
-- nombre que columnas de las tablas del SELECT, así que PL/pgSQL no sabía si una
-- referencia era la variable de salida o la columna. `#variable_conflict
-- use_column` resuelve a favor de la columna.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.list_center_claims()
  RETURNS TABLE (
    id uuid, center_id uuid, center_name text, center_organization text,
    center_address text, user_id uuid, claimant_email text, full_name text,
    claimant_role text, evidence text, contact_phone text, created_at timestamptz
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
#variable_conflict use_column
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles
                 WHERE id = auth.uid() AND role = 'superadmin') THEN
    RAISE EXCEPTION 'Solo un superadmin puede ver las solicitudes';
  END IF;

  RETURN QUERY
    SELECT cl.id, cl.center_id, c.name, c.organization, c.address,
           cl.user_id, u.email::text, cl.full_name, cl.claimant_role,
           cl.evidence, cl.contact_phone, cl.created_at
    FROM public.center_claims cl
    JOIN public.centers c ON c.id = cl.center_id
    JOIN auth.users u ON u.id = cl.user_id
    WHERE cl.status = 'pending'
    ORDER BY cl.created_at ASC;
END;
$$;
