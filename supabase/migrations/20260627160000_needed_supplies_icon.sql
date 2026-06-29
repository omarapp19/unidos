-- ===========================================================================
-- Icono explícito por insumo crítico. Antes el icono se adivinaba por el nombre
-- en el frontend (ej. "palas" caía al icono de corazón por defecto). Ahora el
-- superadmin/admin elige una key del catálogo (src/lib/supplyIcons.tsx) y se
-- persiste aquí. NULL = sin elección → el frontend infiere por nombre.
-- ===========================================================================

ALTER TABLE public.needed_supplies
  ADD COLUMN IF NOT EXISTS icon text;
