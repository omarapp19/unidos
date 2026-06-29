-- ===========================================================================
-- Índices para la lectura pública de centros bajo tráfico alto (miles de
-- lecturas simultáneas tras la difusión masiva). Sin estos índices, la consulta
-- pública hace seq scan + sort en cada petición: bajo carga eso quema CPU de la
-- BD y es la causa probable de un Error 500, no las conexiones. Idempotente;
-- no toca datos. Aplicar con `supabase db push`.
-- ===========================================================================

-- Lectura pública: WHERE is_approved = true ORDER BY created_at DESC.
-- Índice parcial (solo aprobados) + orden descendente: sirve filtro y orden de
-- getApprovedCenters / getApprovedCentersPage sin escanear pendientes.
create index if not exists centers_approved_created_idx
  on public.centers (created_at desc)
  where is_approved = true;

-- Igual pero para la página "solo verificados" (verifiedOnly).
create index if not exists centers_verified_created_idx
  on public.centers (created_at desc)
  where is_approved = true and is_verified = true;

-- Búsqueda libre: getApprovedCentersPage hace `.or(name.ilike, organization.ilike,
-- address.ilike, email.ilike)` = 4 predicados POR COLUMNA (no una concatenación).
-- El planner solo usa trigram si hay un índice GIN por cada columna; con OR los
-- combina por bitmap. Sin esto, cada `%término%` hace seq scan.
create extension if not exists pg_trgm;

create index if not exists centers_name_trgm_idx
  on public.centers using gin (name gin_trgm_ops);
create index if not exists centers_org_trgm_idx
  on public.centers using gin (organization gin_trgm_ops);
create index if not exists centers_address_trgm_idx
  on public.centers using gin (address gin_trgm_ops);
create index if not exists centers_email_trgm_idx
  on public.centers using gin (email gin_trgm_ops);
