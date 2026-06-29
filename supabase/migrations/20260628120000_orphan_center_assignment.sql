-- ===========================================================================
-- Asignar un administrador a un centro "huérfano" (creado por superadmin o por
-- sugerencia pública, sin perfil admin). Dos mecanismos:
--
--   A) Reclamo al registrarse: un usuario nuevo elige un centro existente sin
--      admin y envía una SOLICITUD (center_claims) con pruebas de su vínculo.
--      El superadmin la aprueba/rechaza (anti-fraude).
--
--   B) Invitación por correo: el superadmin invita por correo desde la edición
--      del centro (center_invitations). El invitado fija su contraseña y, al
--      entrar, reclama el centro vía `accept_center_invitation` (verifica que el
--      correo del JWT coincida con la invitación, así no se puede suplantar).
--
-- "Huérfano" = centro aprobado SIN ningún profile.center_id apuntándole.
-- ===========================================================================

-- 1. Tablas ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.center_claims (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id     uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     text NOT NULL,
  -- Rol/cargo de la persona dentro del centro (ej. "Coordinadora", "Voluntario").
  claimant_role text,
  -- Prueba de vínculo en texto libre (anti-fraude: lo revisa el superadmin).
  evidence      text,
  contact_phone text,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Un usuario puede tener a lo sumo UNA solicitud pendiente a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS center_claims_one_pending_per_user
  ON public.center_claims (user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS center_claims_center_idx
  ON public.center_claims (center_id);

CREATE TABLE IF NOT EXISTS public.center_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id   uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  email       text NOT NULL,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'revoked')),
  invited_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Una sola invitación activa (pendiente) por centro.
CREATE UNIQUE INDEX IF NOT EXISTS center_invitations_one_pending_per_center
  ON public.center_invitations (center_id) WHERE status = 'pending';

ALTER TABLE public.center_claims      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.center_invitations ENABLE ROW LEVEL SECURITY;

-- 2. RLS ---------------------------------------------------------------------
--    Solo el superadmin lee/gestiona estas tablas directamente. Los flujos del
--    usuario (crear solicitud, aceptar invitación) van por RPCs SECURITY DEFINER
--    que validan permisos y se saltan RLS de forma controlada.

CREATE POLICY "Superadmin gestiona solicitudes"
  ON public.center_claims
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = 'superadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p
                      WHERE p.id = auth.uid() AND p.role = 'superadmin'));

CREATE POLICY "Superadmin gestiona invitaciones"
  ON public.center_invitations
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = 'superadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p
                      WHERE p.id = auth.uid() AND p.role = 'superadmin'));

-- 3. Helper interno: ¿el centro tiene admin? ---------------------------------
CREATE OR REPLACE FUNCTION public._center_has_admin(p_center_id uuid)
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = 'public'
  STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE center_id = p_center_id
  );
$$;

-- 4. Lista pública de centros huérfanos (para el reclamo al registrarse) ------
--    SECURITY DEFINER + grant a anon: necesita cruzar `profiles` (RLS lo oculta)
--    para saber cuáles centros aprobados no tienen admin. Solo expone datos ya
--    públicos del centro (nombre/organización/dirección).
CREATE OR REPLACE FUNCTION public.list_orphan_centers(p_search text DEFAULT '')
  RETURNS TABLE (
    id uuid, name text, organization text, address text
  )
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = 'public'
  STABLE
AS $$
  SELECT c.id, c.name, c.organization, c.address
  FROM public.centers c
  WHERE c.is_approved = true
    AND NOT public._center_has_admin(c.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.center_invitations i
      WHERE i.center_id = c.id AND i.status = 'pending'
    )
    AND (
      btrim(coalesce(p_search, '')) = ''
      OR c.name ILIKE '%' || btrim(p_search) || '%'
      OR c.organization ILIKE '%' || btrim(p_search) || '%'
      OR c.address ILIKE '%' || btrim(p_search) || '%'
    )
  ORDER BY c.organization, c.name
  LIMIT 20;
$$;

ALTER FUNCTION public.list_orphan_centers(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.list_orphan_centers(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_orphan_centers(text) TO anon, authenticated;

-- 5. Crear una solicitud de reclamo (usuario recién registrado) ---------------
CREATE OR REPLACE FUNCTION public.claim_center(
  p_center_id     uuid,
  p_full_name     text,
  p_claimant_role text,
  p_evidence      text,
  p_contact_phone text
) RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_claim_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para reclamar un centro';
  END IF;

  -- El usuario no debe gestionar ya un centro.
  IF EXISTS (SELECT 1 FROM public.profiles
             WHERE id = v_uid AND center_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Este usuario ya tiene un centro asignado';
  END IF;

  -- El centro debe existir, estar aprobado y no tener admin todavía.
  IF NOT EXISTS (SELECT 1 FROM public.centers
                 WHERE id = p_center_id AND is_approved = true) THEN
    RAISE EXCEPTION 'El centro no existe o no está disponible';
  END IF;
  IF public._center_has_admin(p_center_id) THEN
    RAISE EXCEPTION 'Este centro ya tiene un administrador';
  END IF;

  INSERT INTO public.center_claims
    (center_id, user_id, full_name, claimant_role, evidence, contact_phone)
  VALUES
    (p_center_id, v_uid, btrim(p_full_name),
     NULLIF(btrim(p_claimant_role), ''), NULLIF(btrim(p_evidence), ''),
     NULLIF(btrim(p_contact_phone), ''))
  RETURNING id INTO v_claim_id;

  RETURN v_claim_id;
END;
$$;

ALTER FUNCTION public.claim_center(uuid, text, text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.claim_center(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_center(uuid, text, text, text, text) TO authenticated;

-- 6. Listar solicitudes pendientes (superadmin) ------------------------------
--    Devuelve la solicitud + datos del centro + correo del solicitante.
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

ALTER FUNCTION public.list_center_claims() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.list_center_claims() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_center_claims() TO authenticated;

-- 7. Aprobar una solicitud (superadmin) → asigna el admin --------------------
CREATE OR REPLACE FUNCTION public.approve_center_claim(p_claim_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
DECLARE
  v_claim public.center_claims%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles
                 WHERE id = auth.uid() AND role = 'superadmin') THEN
    RAISE EXCEPTION 'Solo un superadmin puede aprobar solicitudes';
  END IF;

  SELECT * INTO v_claim FROM public.center_claims
  WHERE id = p_claim_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La solicitud no existe o ya fue resuelta';
  END IF;

  IF public._center_has_admin(v_claim.center_id) THEN
    RAISE EXCEPTION 'Este centro ya tiene un administrador';
  END IF;

  -- Asigna al solicitante como admin del centro.
  INSERT INTO public.profiles (id, center_id, role, full_name)
  VALUES (v_claim.user_id, v_claim.center_id, 'admin', v_claim.full_name)
  ON CONFLICT (id) DO UPDATE
    SET center_id = EXCLUDED.center_id,
        role      = 'admin',
        full_name = EXCLUDED.full_name;

  -- Marca esta solicitud aprobada.
  UPDATE public.center_claims
    SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_claim_id;

  -- Rechaza el resto de solicitudes pendientes para el mismo centro.
  UPDATE public.center_claims
    SET status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE center_id = v_claim.center_id AND status = 'pending';

  -- Revoca cualquier invitación pendiente del centro (ya tiene admin).
  UPDATE public.center_invitations
    SET status = 'revoked'
  WHERE center_id = v_claim.center_id AND status = 'pending';
END;
$$;

ALTER FUNCTION public.approve_center_claim(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.approve_center_claim(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_center_claim(uuid) TO authenticated;

-- 8. Rechazar una solicitud (superadmin) -------------------------------------
CREATE OR REPLACE FUNCTION public.reject_center_claim(p_claim_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles
                 WHERE id = auth.uid() AND role = 'superadmin') THEN
    RAISE EXCEPTION 'Solo un superadmin puede rechazar solicitudes';
  END IF;

  UPDATE public.center_claims
    SET status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_claim_id AND status = 'pending';
END;
$$;

ALTER FUNCTION public.reject_center_claim(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.reject_center_claim(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_center_claim(uuid) TO authenticated;

-- 9. Estado del admin de un centro (para la edición del superadmin) ----------
CREATE OR REPLACE FUNCTION public.get_center_admin_status(p_center_id uuid)
  RETURNS TABLE (
    has_admin boolean, admin_email text, pending_invitation_email text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles
                 WHERE id = auth.uid() AND role = 'superadmin') THEN
    RAISE EXCEPTION 'Solo un superadmin puede consultar esto';
  END IF;

  RETURN QUERY
    SELECT
      public._center_has_admin(p_center_id),
      (SELECT u.email::text FROM public.profiles p
         JOIN auth.users u ON u.id = p.id
       WHERE p.center_id = p_center_id LIMIT 1),
      (SELECT i.email FROM public.center_invitations i
       WHERE i.center_id = p_center_id AND i.status = 'pending'
       ORDER BY i.created_at DESC LIMIT 1);
END;
$$;

ALTER FUNCTION public.get_center_admin_status(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_center_admin_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_center_admin_status(uuid) TO authenticated;

-- 10. Aceptar una invitación (invitado) → se asigna como admin ---------------
--     El correo se toma del JWT (auth.email()), no de un parámetro: así el
--     invitado no puede reclamar un centro que no le corresponde.
CREATE OR REPLACE FUNCTION public.accept_center_invitation()
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := auth.email();
  v_inv public.center_invitations%ROWTYPE;
  v_center public.centers%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR v_email IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para aceptar la invitación';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles
             WHERE id = v_uid AND center_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Este usuario ya tiene un centro asignado';
  END IF;

  SELECT * INTO v_inv FROM public.center_invitations
  WHERE lower(email) = lower(v_email) AND status = 'pending'
  ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No hay ninguna invitación pendiente para tu correo';
  END IF;

  SELECT * INTO v_center FROM public.centers
  WHERE id = v_inv.center_id AND is_approved = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El centro ya no está disponible';
  END IF;
  IF public._center_has_admin(v_inv.center_id) THEN
    RAISE EXCEPTION 'Este centro ya tiene un administrador';
  END IF;

  INSERT INTO public.profiles (id, center_id, role, full_name)
  VALUES (v_uid, v_inv.center_id, 'admin',
          COALESCE(NULLIF(btrim(v_center.name), ''), v_center.organization))
  ON CONFLICT (id) DO UPDATE
    SET center_id = EXCLUDED.center_id,
        role      = 'admin',
        full_name = EXCLUDED.full_name;

  UPDATE public.center_invitations
    SET status = 'accepted', accepted_at = now(), accepted_by = v_uid
  WHERE id = v_inv.id;

  RETURN v_inv.center_id;
END;
$$;

ALTER FUNCTION public.accept_center_invitation() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.accept_center_invitation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_center_invitation() TO authenticated;
