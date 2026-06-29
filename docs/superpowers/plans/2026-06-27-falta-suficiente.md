# Falta/Suficiente + Retiro de "Donaciones en Vivo" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el ticker falso (`Math.random`) por datos reales: "qué falta" (curado, `needed_supplies`) y "qué ya hay suficiente" (derivado de donaciones), a nivel red y por centro.

**Architecture:** Extender `needed_supplies` con `center_id` (NULL=red) + RLS admin. RPC `SECURITY DEFINER` para resumen cualitativo por centro (sin números). UI: home reusa `publicTotals`; ficha usa slot `urgentSupplies` + nueva sección; admin gestiona la falta de su centro.

**Tech Stack:** React + TS + Vite, Supabase (Postgres + RLS + RPC). Sin test runner (verificación = `npm run typecheck`, `npm run build`, checks manuales, SQL).

## Global Constraints

- El público **nunca ve cantidades** por centro. "Suficiente" por centro = cualitativo (nombres de categoría), vía RPC.
- **No repetir** insumos críticos en el home: "falta" solo arriba del mapa.
- Seguir patrones existentes: `withRetry`, `fromPostgrestError`, migraciones SQL idempotentes (`IF NOT EXISTS`), RPC `SET search_path = 'public'`.
- Migraciones se aplican con `supabase db push` (el usuario lo ejecuta si el agente no tiene credenciales).
- Mantener español en copy y comentarios, igual que el resto del repo.

---

### Task 1: Migración — `needed_supplies.center_id` + RLS admin + RPC resumen

**Files:**
- Create: `supabase/migrations/20260627150000_supplies_per_center.sql`

**Interfaces:**
- Produces: columna `needed_supplies.center_id uuid NULL`; RPC `public.get_center_public_summary(p_center_id uuid) RETURNS TABLE(category_id uuid, category_name text, rank int)`.

- [ ] **Step 1: Crear la migración**

```sql
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
```

- [ ] **Step 2: Aplicar y verificar**

Run: `supabase db push`
Expected: aplica sin error. Luego en SQL: `SELECT * FROM get_center_public_summary('<id-centro-con-donaciones>');` devuelve filas (category_name, rank) sin cantidades. Un centro sin donaciones devuelve 0 filas.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260627150000_supplies_per_center.sql
git commit -m "feat(db): falta por centro en needed_supplies + RPC resumen publico"
```

---

### Task 2: API `supplies.ts` — filtro por centro + resumen

**Files:**
- Modify: `src/lib/api/supplies.ts`

**Interfaces:**
- Consumes: tabla/RPC de Task 1.
- Produces:
  - `getNeededSupplies(centerId?: string | null): Promise<NeededSupply[]>` (omitido/`null` = globales `center_id IS NULL`).
  - `addNeededSupply(name: string, centerId?: string | null): Promise<NeededSupply>`.
  - `getCenterPublicSummary(centerId: string): Promise<CenterSupplyCategory[]>` con `CenterSupplyCategory = { category_id: string; category_name: string; rank: number }`.
  - `NeededSupply` gana `center_id?: string | null`.

- [ ] **Step 1: Extender tipos y `getNeededSupplies`**

```ts
export interface NeededSupply {
  id: string;
  name: string;
  center_id?: string | null;
  created_at?: string;
}

export interface CenterSupplyCategory {
  category_id: string;
  category_name: string;
  rank: number;
}

/** Lista insumos: `null`/omitido = globales (red); un id = los de ese centro. */
export function getNeededSupplies(centerId?: string | null): Promise<NeededSupply[]> {
  return withRetry(async () => {
    try {
      let q = supabase
        .from('needed_supplies')
        .select('id, name, center_id, created_at')
        .order('created_at', { ascending: true });
      q = centerId == null ? q.is('center_id', null) : q.eq('center_id', centerId);
      const { data, error } = await q;
      if (error) {
        if (error.code === '42P01') return centerId == null ? DEFAULT_SUPPLIES : [];
        throw fromPostgrestError(error);
      }
      return data ?? [];
    } catch (err: any) {
      if (err?.code === '42P01' || err?.message?.includes('42P01')) {
        return centerId == null ? DEFAULT_SUPPLIES : [];
      }
      return centerId == null ? DEFAULT_SUPPLIES : [];
    }
  });
}
```

- [ ] **Step 2: `addNeededSupply` con centro + `getCenterPublicSummary`**

```ts
/** Añade un insumo. `centerId` null/omitido = global (requiere superadmin). */
export function addNeededSupply(name: string, centerId?: string | null): Promise<NeededSupply> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('needed_supplies')
      .insert({ name, center_id: centerId ?? null })
      .select()
      .single();
    if (error) throw fromPostgrestError(error);
    return data;
  });
}

/** Top categorías recibidas por un centro (cualitativo, sin cantidades). */
export function getCenterPublicSummary(centerId: string): Promise<CenterSupplyCategory[]> {
  return withRetry(async () => {
    const { data, error } = await supabase.rpc('get_center_public_summary', {
      p_center_id: centerId,
    });
    if (error) throw fromPostgrestError(error);
    return (data ?? []) as CenterSupplyCategory[];
  });
}
```

`updateNeededSupply` y `deleteNeededSupply` no cambian de firma (RLS valida).

- [ ] **Step 3: Verificar y commit**

Run: `npm run typecheck`
Expected: sin errores.

```bash
git add src/lib/api/supplies.ts
git commit -m "feat(api): supplies por centro + resumen publico de categorias"
```

---

### Task 3: Home — quitar ticker falso, card "suficiente", quitar "En Vivo"

**Files:**
- Modify: `src/pages/PublicHome.tsx`

**Interfaces:**
- Consumes: `publicTotals` (existente: `{ category, quantity, percentage }[]` orden desc); `neededSupplies` (existente).

- [ ] **Step 1: Borrar el simulador**

Eliminar de `PublicHome.tsx`: el componente `DonationSimulator` (≈líneas 111-225), `DONATION_TEMPLATES`, `getSimulatedIcon`, `THEME_STYLES`, la interfaz `SimulatedDonation`, y los imports de iconos que queden sin uso (`Activity` se conserva si lo usa el bloque de insumos; verificar con typecheck). Quitar `useState`/`useEffect` que solo servían al simulador (no tocar los del componente `PublicHome`).

- [ ] **Step 2: Reemplazar el lado derecho del chart**

En la sección "Qué se está donando en la red" (≈línea 839), sustituir `<DonationSimulator />` por una card de "suficiente" derivada de `publicTotals`:

```tsx
{/* Lado derecho: lo que la red ya recibe con más frecuencia (datos reales) */}
<div className="w-full">
  <div className="flex flex-col h-full rounded-xl border border-line-soft bg-surface-2/30 p-4">
    <div className="flex items-center gap-1.5 border-b border-line-soft pb-2.5 mb-3">
      <BarChart3 className="h-4 w-4 text-success" />
      <span className="font-display text-2xs font-black uppercase tracking-wider text-ink">
        Lo que ya se recibe con frecuencia
      </span>
    </div>
    {publicTotals.length > 0 ? (
      <ul className="flex flex-col gap-2">
        {publicTotals.slice(0, 5).map((t, i) => (
          <li
            key={t.category.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-line-soft bg-surface"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success-ink font-display text-xs font-black shrink-0">
              {i + 1}
            </span>
            <span className="font-display text-sm font-black tracking-tight text-ink">
              {t.category.name}
            </span>
          </li>
        ))}
      </ul>
    ) : (
      <EmptyState title="Aún no hay datos" description="Todavía no se han registrado donaciones." />
    )}
  </div>
</div>
```

- [ ] **Step 3: Quitar el badge "En Vivo" de Insumos Críticos**

En el bloque "Insumos Críticos Requeridos" (≈líneas 669-676) borrar el `<span>` del indicador "En Vivo". Conservar título e iconos.

- [ ] **Step 4: Verificar y commit**

Run: `npm run typecheck && npm run build`
Expected: sin errores, sin `Math.random` en el archivo (`grep -n "Math.random" src/pages/PublicHome.tsx` → vacío).
Manual: `npm run dev`, home muestra lista "Lo que ya se recibe" con categorías reales, sin ticker, sin "En Vivo".

```bash
git add src/pages/PublicHome.tsx
git commit -m "feat(home): retira ticker falso, muestra lo mas recibido real"
```

---

### Task 4: Ficha de centro — falta + "lo que ya recibe"

**Files:**
- Modify: `src/components/domain/CenterDetailModal.tsx`
- Modify: `src/pages/PublicHome.tsx`

**Interfaces:**
- Consumes: `getNeededSupplies(centerId)`, `getCenterPublicSummary(centerId)` (Task 2). `CenterDetailModal` ya tiene `urgentSupplies?: string[]`.
- Produces: prop nueva `receivedCategories?: string[]` en `CenterDetailModalProps`.

- [ ] **Step 1: Nueva sección en el modal**

En `CenterDetailModal.tsx` añadir prop `receivedCategories?: string[]` (default `[]`) y, tras el bloque "Necesita con urgencia", renderizar:

```tsx
{receivedCategories.length > 0 && (
  <div>
    <p className="mb-1.5 font-body text-2xs font-bold uppercase tracking-eyebrow text-subtle">
      Lo que ya recibe con frecuencia
    </p>
    <ul className="flex flex-wrap gap-1.5">
      {receivedCategories.map((cat) => (
        <li
          key={cat}
          className="rounded-pill bg-success-bg px-3 py-1 font-body text-2xs font-bold text-success-ink"
        >
          {cat}
        </li>
      ))}
    </ul>
  </div>
)}
```

- [ ] **Step 2: Cargar datos por centro on-demand en PublicHome**

En `PublicHome.tsx`, junto a `detailCenter`, añadir estado y carga al abrir:

```tsx
const [detailFalta, setDetailFalta] = useState<string[]>([]);
const [detailRecibe, setDetailRecibe] = useState<string[]>([]);

useEffect(() => {
  if (!detailCenter) { setDetailFalta([]); setDetailRecibe([]); return; }
  let active = true;
  getNeededSupplies(detailCenter.id)
    .then((rows) => { if (active) setDetailFalta(rows.map((r) => r.name)); })
    .catch(() => { if (active) setDetailFalta([]); });
  getCenterPublicSummary(detailCenter.id)
    .then((rows) => { if (active) setDetailRecibe(rows.map((r) => r.category_name)); })
    .catch(() => { if (active) setDetailRecibe([]); });
  return () => { active = false; };
}, [detailCenter]);
```

Añadir import: `import { getNeededSupplies, getCenterPublicSummary } from '@/lib/api/supplies';` (ampliar el import existente de `supplies`).

- [ ] **Step 3: Pasar props al modal**

```tsx
<CenterDetailModal
  center={detailCenter}
  open={detailCenter !== null}
  onClose={() => setDetailCenter(null)}
  distanceKm={detailCenter ? kmById.get(detailCenter.id) ?? null : null}
  urgentSupplies={detailFalta}
  receivedCategories={detailRecibe}
/>
```

- [ ] **Step 4: Verificar y commit**

Run: `npm run typecheck && npm run build`
Expected: sin errores.
Manual: abrir un centro con donaciones → muestra "Lo que ya recibe"; con falta declarada → "Necesita con urgencia". Centro sin datos → ninguna sección.

```bash
git add src/components/domain/CenterDetailModal.tsx src/pages/PublicHome.tsx
git commit -m "feat(centro): ficha muestra falta y lo que ya recibe"
```

---

### Task 5: Admin gestiona la falta de su centro

**Files:**
- Modify: `src/pages/admin/Dashboard.tsx`
- Modify: `src/pages/super/SuperSupplies.tsx`

**Interfaces:**
- Consumes: `getNeededSupplies(centerId)`, `addNeededSupply(name, centerId)`, `deleteNeededSupply` (Task 2).

- [ ] **Step 1: Ungate + per-centro en Dashboard**

En `Dashboard.tsx`:
- Renderizar el manager para cualquier admin con centro: cambiar `{isSuperadmin && <SuperadminSuppliesManager />}` por `{centerId && <CenterSuppliesManager centerId={centerId} />}`.
- Renombrar `SuperadminSuppliesManager` → `CenterSuppliesManager(props: { centerId: string })`.
- Dentro: `getNeededSupplies(centerId)` en `loadSupplies`; `addNeededSupply(name, centerId)` en `handleAdd`. Título "Lo que tu centro necesita", texto de ayuda acorde.

- [ ] **Step 2: SuperSupplies explícito global**

En `SuperSupplies.tsx`: `create.mutate` debe pasar `null` como centro. Cambiar la mutación a `useMutation((name: string) => addNeededSupply(name, null))` (gestiona la falta de red). Lectura `getNeededSupplies()` ya devuelve globales. Sin más cambios.

- [ ] **Step 3: Verificar y commit**

Run: `npm run typecheck && npm run build`
Expected: sin errores.
Manual: admin no-superadmin ve y edita SOLO la falta de su centro; lo creado aparece en la ficha pública de ese centro. Superadmin sigue editando las globales (banner del home).

```bash
git add src/pages/admin/Dashboard.tsx src/pages/super/SuperSupplies.tsx
git commit -m "feat(admin): cada centro gestiona su propia lista de falta"
```

---

## Notas de verificación final

- `grep -rn "Math.random" src/pages/PublicHome.tsx` → vacío.
- Home: izquierda %; derecha "lo más recibido"; arriba del mapa "falta" sin "En Vivo".
- Ficha: "Necesita con urgencia" (falta del centro) + "Lo que ya recibe" (RPC).
- RLS: admin del centro A no puede tocar la falta del centro B (probar con dos cuentas o vía API REST).
- Privacidad: el público nunca recibe cantidades por centro (RPC solo devuelve nombres + rank).
