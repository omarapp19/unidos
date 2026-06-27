-- ===========================================================================
-- Falta por centro + resumen público cualitativo por centro.
--  · needed_supplies gana center_id (NULL = red/global, valor = de ese centro).
--  · RLS: admin gestiona la falta de su propio centro; superadmin, todo.
--  · RPC get_center_public_summary: top categorías recibidas por centro,
--    SOLO nombres (sin cantidades) — respeta "el público no ve números".
-- ===========================================================================

-- 1. Columna center_id ------------------------------------------------------
ALTER TABLE public.needed_supplies
  ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id) ON DELETE CASCADE;

-- 2. Unicidad: name único por centro, y único entre globales -----------------
ALTER TABLE public.needed_supplies DROP CONSTRAINT IF EXISTS needed_supplies_name_key;
DROP INDEX IF EXISTS needed_supplies_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS needed_supplies_center_name_key
  ON public.needed_supplies (center_id, name) WHERE center_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS needed_supplies_global_name_key
  ON public.needed_supplies (name) WHERE center_id IS NULL;

-- 3. RLS: escritura del admin sobre la falta de SU centro --------------------
DROP POLICY IF EXISTS "Admin gestiona la falta de su centro" ON public.needed_supplies;
CREATE POLICY "Admin gestiona la falta de su centro"
  ON public.needed_supplies
  FOR ALL
  TO authenticated
  USING (
    center_id IS NOT NULL
    AND center_id = (SELECT center_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    center_id IS NOT NULL
    AND center_id = (SELECT center_id FROM public.profiles WHERE id = auth.uid())
  );
-- (La política superadmin "Gestión completa..." y la lectura pública siguen vigentes.)

-- 4. RPC: resumen público cualitativo por centro -----------------------------
CREATE OR REPLACE FUNCTION public.get_center_public_summary(p_center_id uuid)
  RETURNS TABLE(category_id uuid, category_name text, rank int)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
  SELECT c.id, c.name,
         row_number() OVER (ORDER BY SUM(di.quantity) DESC)::int AS rank
  FROM public.donation_items di
  JOIN public.donations d ON d.id = di.donation_id
  JOIN public.categories c ON c.id = di.category_id
  WHERE d.center_id = p_center_id
  GROUP BY c.id, c.name
  ORDER BY SUM(di.quantity) DESC
  LIMIT 5;
$$;

ALTER FUNCTION public.get_center_public_summary(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_center_public_summary(uuid) TO anon, authenticated;
