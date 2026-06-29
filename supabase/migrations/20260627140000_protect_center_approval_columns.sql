-- ===========================================================================
-- Cierra una escalación de privilegios: la política de UPDATE
-- "Admins modifican su propio centro" no tiene WITH CHECK, así que reusa el
-- USING (id = mi_center_id) como check de la fila nueva. Eso permite que el
-- admin DUEÑO de un centro modifique cualquier columna del suyo —incluidas
-- is_approved e is_verified— pegándole directo a la API REST con su token, sin
-- pasar por la revisión del superadmin (la UI no lo ofrece, pero RLS lo deja).
--
-- En vez de tocar la política (que también restringiría a los flujos legítimos
-- approveCenter/setCenterVerified, que corren como superadmin contra la tabla),
-- se agrega un trigger BEFORE UPDATE que bloquea el cambio de is_approved /
-- is_verified cuando quien actualiza es un usuario 'authenticated' que NO es
-- superadmin. service_role, migraciones (postgres) y sesiones superadmin pasan.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.enforce_center_approval_guard()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
BEGIN
  -- Solo nos importa cuando estas columnas sensibles cambian de valor.
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved
     OR NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN

    -- auth.role() = 'authenticated' => llamada de un usuario logueado vía API.
    -- service_role y el rol postgres (migraciones/seed) caen fuera de esta rama.
    IF auth.role() = 'authenticated'
       AND NOT EXISTS (
         SELECT 1 FROM public.profiles
         WHERE id = auth.uid() AND role = 'superadmin'
       ) THEN
      RAISE EXCEPTION
        'Solo un superadmin puede aprobar o verificar un centro'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.enforce_center_approval_guard() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_centers_protect_approval ON public.centers;
CREATE TRIGGER trg_centers_protect_approval
  BEFORE UPDATE ON public.centers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_center_approval_guard();
