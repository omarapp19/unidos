# Diseño — "Qué falta" y "Qué ya tienen suficiente" + retiro de "Donaciones en Vivo"

Fecha: 2026-06-27
Estado: aprobado (brainstorming)

## Contexto y motivación

La sección "Qué se está donando en la red" (home público) muestra a la derecha un
simulador "Actividad Reciente (En Vivo)" (`DonationSimulator`) que inventa cifras con
`Math.random()` (ej. "+12 Agua"). Mostrar datos inventados contradice el principio del
producto: claridad, consistencia y datos reales. Se retira.

Se fusionan dos tickets en uno:

1. **Esconder "Donaciones en Vivo"** — eliminar el ticker falso.
2. **Mostrar "qué falta" y "qué ya tienen suficiente"** — a nivel red (home) y por
   centro (ficha).

Semántica:

- **Falta** = insumos críticos que se necesitan. Dato **manual/curado**
  (`needed_supplies`).
- **Suficiente** = lo que más se ha recibido. Dato **real derivado** de las donaciones.

## Decisiones tomadas

- Alcance: **ambos** niveles — red (home) y por centro (ficha).
- Fuente de "falta": **manual** (`needed_supplies`), extendida con `center_id`.
- Fuente de "suficiente": **derivada** de donaciones reales.
- **No repetir** insumos críticos en el home: "falta" vive **solo** arriba del mapa
  (bloque "INSUMOS CRÍTICOS REQUERIDOS"); "suficiente" reemplaza al ticker.
- Privacidad: el público **nunca ve cantidades** por centro. "Suficiente" por centro es
  **cualitativo** (nombres de categoría rankeados), vía RPC `SECURITY DEFINER`.

## Restricciones del modelo actual

- `donations` es RLS-privado; `donation_items` es público pero **no expone `center_id`**.
  ⇒ El público no puede derivar "suficiente por centro" directamente → requiere RPC.
- `needed_supplies.name` es `UNIQUE` global y RLS solo-superadmin.
- `CenterDetailModal` ya tiene slot `urgentSupplies?: string[]` → sección "Necesita con
  urgencia", hoy **nunca poblado**. Es el lugar de "falta por centro".
- `Dashboard` (admin) ya deriva `topCategory`/`categoryTotals` por centro (privado).
- `PublicHome` ya calcula `publicTotals` (categorías agregadas de red).

---

## Bloque 1 — Modelo de datos

### `needed_supplies`

Nueva migración:

- `+ center_id uuid NULL REFERENCES public.centers(id) ON DELETE CASCADE`.
  - `NULL` = falta a nivel **red** (comportamiento actual).
  - valor = falta de **ese centro**.
- Reemplazar `UNIQUE(name)` por índice único compuesto. Como Postgres trata `NULL` como
  distinto, usar índice único parcial para garantizar unicidad real:
  - `UNIQUE (center_id, name)` para filas con `center_id` no nulo.
  - índice único parcial sobre `(name) WHERE center_id IS NULL` para las globales.
- RLS:
  - SELECT público (igual que hoy).
  - Escritura superadmin: cualquier fila (igual que hoy).
  - Escritura admin: solo filas donde `center_id = (SELECT center_id FROM profiles WHERE id = auth.uid())`.

### RPC `get_center_public_summary(p_center_id uuid)`

- `SECURITY DEFINER`, `STABLE`.
- Lee `donations` + `donation_items` del centro, agrupa por categoría, ordena por
  cantidad desc.
- Devuelve **solo** `category_id`, `category_name` y un ranking (top N, p. ej. 5).
  **Nunca** cantidades, productos ni donantes.
- `GRANT EXECUTE` a `anon` y `authenticated`.

## Bloque 2 — Home público (red)

`src/pages/PublicHome.tsx`, sección "Qué se está donando en la red":

- **Eliminar** `DonationSimulator`, `DONATION_TEMPLATES`, `getSimulatedIcon`,
  `THEME_STYLES` y tipos asociados (`SimulatedDonation`) si no se reutilizan. Quitar todo
  `Math.random` de este flujo.
- **Lado izquierdo:** sin cambios (chart `CategoryBar` % por categoría).
- **Lado derecho:** card **"Lo que ya hay suficiente"** = lo más donado en la red.
  - Derivar de `publicTotals` (reuso): top N categorías por cantidad, mostrar nombres
    ordenados. **Sin números.** Lista/chips cualitativos.
  - Sin badge "EN VIVO", sin animación de feed falso.
- **Bloque arriba del mapa** ("INSUMOS CRÍTICOS REQUERIDOS"): se mantiene como "falta" de
  red (`needed_supplies` con `center_id IS NULL`). **Quitar badge "EN VIVO".**

## Bloque 3 — Ficha de centro (público, por centro)

`src/components/domain/CenterDetailModal.tsx`:

- **"Necesita con urgencia"** (slot `urgentSupplies`): poblar con `needed_supplies` de ese
  centro (`center_id = center.id`) = qué **falta**. Si vacío, no se muestra (actual).
- **Nueva sección "Lo que ya recibe"**: chips de categorías top del centro vía
  `get_center_public_summary`. Cualitativo, sin números. Si vacío, no se muestra.

`src/pages/PublicHome.tsx`:

- Al abrir el modal (`detailCenter`), cargar **on-demand** (no para los N centros del
  mapa):
  - falta del centro: `getNeededSupplies(center.id)`.
  - suficiente del centro: `getCenterPublicSummary(center.id)`.
- Pasar resultados como props al modal.

## Bloque 4 — Gestión (admin / superadmin)

`src/lib/api/supplies.ts`:

- `getNeededSupplies(centerId?: string | null)` — `null`/omitido = globales; valor = de
  ese centro. (Filtra por `center_id IS NULL` vs `eq('center_id', id)`.)
- `addNeededSupply(name, centerId?: string | null)` — inserta con `center_id`.
- `updateNeededSupply`, `deleteNeededSupply` — sin cambio de firma (RLS valida permiso).
- Nueva `getCenterPublicSummary(centerId)` → llama al RPC.

`src/pages/admin/Dashboard.tsx`:

- Quitar gate `isSuperadmin` de `SuperadminSuppliesManager` (renombrar a algo neutro, p.
  ej. `CenterSuppliesManager`).
- Operar sobre `profile.center_id`: cargar/crear/borrar falta **del propio centro**.
- Título "Lo que tu centro necesita". "Suficiente" no se gestiona (es derivado, ya
  visible en el mosaico del centro).

`src/pages/super/SuperSupplies.tsx`:

- Sigue gestionando las **globales** (`center_id = null`). Sin cambios funcionales
  (pasar `null` explícito al crear).
- Selector para editar las de un centro puntual: **fuera de alcance** (fase 2).

## Bloque 5 — Derivación + pruebas

Derivación:

- **Red "suficiente":** reusar `publicTotals`, top N por cantidad, solo nombres.
- **Centro "suficiente":** RPC `get_center_public_summary`, top N nombres de categoría.
- **Falta (red/centro):** lectura directa de `needed_supplies` filtrada por `center_id`.

Pruebas:

- RPC con centro con donaciones (devuelve top categorías) y sin donaciones (vacío).
- RLS escritura admin: admin del centro A no puede crear/editar/borrar falta del centro B.
- RLS escritura admin: admin sí gestiona la falta de su propio centro.
- Home: sin `Math.random`; "suficiente" refleja `publicTotals`.
- Modal: muestra/oculta "Necesita con urgencia" y "Lo que ya recibe" según haya data.
- Migración: índice único impide duplicar `name` dentro del mismo `center_id` (y entre
  globales).

## Fuera de alcance

- Editor superadmin de falta por centro arbitrario (fase 2).
- Mostrar cantidades exactas por centro al público (viola privacidad por diseño).
- Cambiar el chart de % de la izquierda.
