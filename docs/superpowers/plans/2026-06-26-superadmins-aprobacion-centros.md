# Superadmins y aprobación de centros — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al rol `superadmin` un panel propio para aprobar/rechazar/verificar/editar centros, registrar centros huérfanos y gestionar categorías.

**Architecture:** Una migración añade los huecos de RLS/RPC (política de categorías con `WITH CHECK`, política DELETE en `centers`, RPC `admin_register_center` SECURITY DEFINER). El cliente gana funciones de repositorio, un guard por rol y dos páginas bajo `/admin/super/*` con un layout propio. Aprobar/verificar/editar usan UPDATE directo (RLS ya lo permite a superadmin); el alta de huérfanos y el CRUD de categorías usan el RPC y las políticas nuevas.

**Tech Stack:** React 18 + Vite + TypeScript, react-router-dom 7, Tailwind, Supabase JS, DS propio (`@/components/ui`), hooks `useQuery`/`useMutation`.

## Global Constraints

- Sin runner de pruebas en el repo. **Gate de verificación de cada tarea = `npm run typecheck` (alias de `tsc --noEmit`) en verde** + la verificación manual indicada. No añadir vitest/jest.
- Acceso a datos SIEMPRE por repositorios `src/lib/api/*` + hooks; la UI nunca llama a `supabase` directo.
- Toda función de API usa `fromPostgrestError` para errores PostgREST y `withRetry` solo en LECTURAS (las mutaciones no se reintentan).
- Textos de UI en español. Reusar primitivas del DS (`Button`, `Card`, `Badge`, `Modal`, `Input`, `Select`, `Spinner`, `EmptyState`, `QueryBoundary`); sin librerías nuevas.
- Migraciones en `supabase/migrations/`, aplicar con `supabase db push`.
- Mensajes de commit en inglés, Conventional Commits.

---

### Task 1: Migración SQL (RLS + RPC)

**Files:**
- Create: `supabase/migrations/20260626180000_superadmin_flows.sql`

**Interfaces:**
- Produces (en BD): política `categories` con `WITH CHECK` para superadmin; política DELETE en `centers` para superadmin; RPC `public.admin_register_center(p_name text, p_organization text, p_address text, p_schedule text, p_phone text, p_whatsapp text, p_instagram text, p_website text, p_email text, p_lat double precision, p_lng double precision, p_is_approved boolean DEFAULT true, p_is_verified boolean DEFAULT false) RETURNS uuid`.

- [ ] **Step 1: Crear el archivo de migración**

```sql
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
```

- [ ] **Step 2: Aplicar la migración**

Run: `supabase db push`
Expected: aplica sin error; lista `20260626180000_superadmin_flows.sql` como aplicada.

- [ ] **Step 3: Sembrar el primer superadmin (manual, una vez)**

En el SQL editor de Supabase (no en migración, no versionar el id):
```sql
UPDATE public.profiles SET role = 'superadmin' WHERE id = '<auth-user-id>';
```
Expected: `UPDATE 1`. (Si el usuario aún no tiene perfil, crear cuenta y registrar un centro primero, o insertar el perfil a mano.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260626180000_superadmin_flows.sql
git commit -m "feat(db): superadmin category/delete policies and admin_register_center rpc"
```

---

### Task 2: Tipo `Profile.center_id` nullable

**Files:**
- Modify: `src/types/index.ts` (interface `Profile`)

**Interfaces:**
- Produces: `Profile.center_id: string | null`.

El superadmin no gestiona un centro, así que `center_id` puede ser null. El esquema ya lo permite (`center_id uuid` nullable). `auth.tsx` ya trata `prof?.center_id` como opcional, así que no rompe.

- [ ] **Step 1: Cambiar el tipo**

En `src/types/index.ts`, dentro de `interface Profile`, reemplazar:
```ts
  /** Centro que gestiona. */
  center_id: string;
```
por:
```ts
  /** Centro que gestiona; null para superadmin (no gestiona ninguno). */
  center_id: string | null;
```

- [ ] **Step 2: Verificar typecheck (detecta usos que asumían no-null)**

Run: `npm run typecheck`
Expected: PASS. Si algún archivo asumía `center_id` no-null y falla, arreglar con guarda (`profile.center_id ?? ...` o `if (!profile.center_id) return`). Revisar especialmente `src/pages/admin/*` y `AdminLayout.tsx` (que ya usa `center?.name`, no `center_id` directo → no debería fallar).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "refactor(types): allow null center_id for superadmin profiles"
```

---

### Task 3: Repositorio `centers.ts` — funciones de superadmin

**Files:**
- Modify: `src/lib/api/centers.ts`

**Interfaces:**
- Consumes: `supabase`, `fromPostgrestError`, `withRetry`, `Center`, constante `COLUMNS` (ya en el archivo).
- Produces:
  - `getAllCenters(): Promise<Center[]>`
  - `approveCenter(id: string): Promise<void>`
  - `setCenterVerified(id: string, value: boolean): Promise<void>`
  - `updateCenterAdmin(id: string, patch: CenterPatch): Promise<Center>`
  - `deleteCenter(id: string): Promise<void>`
  - `adminRegisterCenter(input: AdminRegisterCenterInput): Promise<string>`
  - tipos `CenterPatch`, `AdminRegisterCenterInput`.

- [ ] **Step 1: Añadir tipos y funciones al final de `src/lib/api/centers.ts`**

```ts
/** Campos editables de un centro por el superadmin (corrección de datos/coords). */
export interface CenterPatch {
  name?: string;
  organization?: string;
  address?: string;
  schedule?: string;
  phone?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  website?: string | null;
  email?: string | null;
  lat?: number;
  lng?: number;
  status?: Center['status'];
}

/** Datos para registrar un centro huérfano (sin cuenta admin). */
export interface AdminRegisterCenterInput {
  name: string;
  organization: string;
  address: string;
  schedule: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  website?: string;
  email?: string;
  lat: number;
  lng: number;
  isApproved?: boolean;
  isVerified?: boolean;
}

/** Todos los centros (RLS los devuelve solo a superadmin): pendientes primero. */
export function getAllCenters(): Promise<Center[]> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('centers')
      .select(COLUMNS)
      .order('is_approved', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw fromPostgrestError(error);
    return (data ?? []) as unknown as Center[];
  });
}

/** Aprueba un centro (lo hace visible al público). */
export async function approveCenter(id: string): Promise<void> {
  const { error } = await supabase
    .from('centers')
    .update({ is_approved: true })
    .eq('id', id);
  if (error) throw fromPostgrestError(error);
}

/** Marca/desmarca el sello de organización verificada. */
export async function setCenterVerified(id: string, value: boolean): Promise<void> {
  const { error } = await supabase
    .from('centers')
    .update({ is_verified: value })
    .eq('id', id);
  if (error) throw fromPostgrestError(error);
}

/** Edita datos/coordenadas de un centro y devuelve la fila actualizada. */
export function updateCenterAdmin(id: string, patch: CenterPatch): Promise<Center> {
  return new Promise((resolve, reject) => {
    supabase
      .from('centers')
      .update(patch)
      .eq('id', id)
      .select(COLUMNS)
      .single()
      .then(({ data, error }) => {
        if (error) return reject(fromPostgrestError(error));
        resolve(data as unknown as Center);
      });
  });
}

/** Rechaza/elimina un centro (solo superadmin por RLS). */
export async function deleteCenter(id: string): Promise<void> {
  const { error } = await supabase.from('centers').delete().eq('id', id);
  if (error) throw fromPostgrestError(error);
}

/** Registra un centro huérfano vía RPC SECURITY DEFINER. Devuelve su id. */
export async function adminRegisterCenter(
  input: AdminRegisterCenterInput,
): Promise<string> {
  const { data, error } = await supabase.rpc('admin_register_center', {
    p_name: input.name.trim(),
    p_organization: input.organization.trim(),
    p_address: input.address.trim(),
    p_schedule: input.schedule.trim(),
    p_phone: input.phone?.trim() || null,
    p_whatsapp: input.whatsapp?.trim() || null,
    p_instagram: input.instagram?.trim() || null,
    p_website: input.website?.trim() || null,
    p_email: input.email?.trim() || null,
    p_lat: input.lat,
    p_lng: input.lng,
    p_is_approved: input.isApproved ?? true,
    p_is_verified: input.isVerified ?? false,
  });
  if (error) throw fromPostgrestError(error);
  return data as string;
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/centers.ts
git commit -m "feat(api): superadmin center operations (list/approve/verify/edit/delete/register)"
```

---

### Task 4: Repositorio `categories.ts` — CRUD

**Files:**
- Modify: `src/lib/api/categories.ts`

**Interfaces:**
- Consumes: `supabase`, `fromPostgrestError`, `Category` (ya importado).
- Produces:
  - `createCategory(input: { name: string; unit: string }): Promise<Category>`
  - `updateCategory(id: string, patch: { name?: string; unit?: string }): Promise<Category>`
  - `deleteCategory(id: string): Promise<void>`

- [ ] **Step 1: Añadir funciones al final de `src/lib/api/categories.ts`**

```ts
/** Crea una categoría (solo superadmin por RLS). Devuelve la fila creada. */
export async function createCategory(input: {
  name: string;
  unit: string;
}): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: input.name.trim(), unit: input.unit.trim() })
    .select('id, name, unit')
    .single();
  if (error) throw fromPostgrestError(error);
  return data as Category;
}

/** Actualiza nombre/unidad de una categoría (solo superadmin). */
export async function updateCategory(
  id: string,
  patch: { name?: string; unit?: string },
): Promise<Category> {
  const clean: { name?: string; unit?: string } = {};
  if (patch.name !== undefined) clean.name = patch.name.trim();
  if (patch.unit !== undefined) clean.unit = patch.unit.trim();
  const { data, error } = await supabase
    .from('categories')
    .update(clean)
    .eq('id', id)
    .select('id, name, unit')
    .single();
  if (error) throw fromPostgrestError(error);
  return data as Category;
}

/** Elimina una categoría (solo superadmin). Falla si tiene ítems (FK RESTRICT). */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw fromPostgrestError(error);
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/categories.ts
git commit -m "feat(api): category CRUD for superadmin"
```

---

### Task 5: Guard por rol `RequireRole`

**Files:**
- Create: `src/components/layout/RequireRole.tsx`

**Interfaces:**
- Consumes: `useAuth` (de `@/lib/auth`), `Spinner` (de `@/components/ui`), `Navigate` (react-router-dom), `UserRole` (de `@/types`).
- Produces: `RequireRole({ role, children }: { role: UserRole; children: ReactNode }): JSX.Element`.

Espera la resolución de sesión; si no autenticado → `/admin/login`; si autenticado pero el rol no coincide → `/admin`; si coincide, renderiza.

- [ ] **Step 1: Crear el componente**

```tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '@/types';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';

/* ===========================================================================
   Guard por rol. Reusa el estado de sesión de AuthProvider. Bloquea rutas de
   superadmin: un admin de centro normal es redirigido a su panel.
   ========================================================================== */

export function RequireRole({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const { status, profile } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner label="Cargando…" />
      </div>
    );
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/admin/login" replace />;
  }
  if (profile?.role !== role) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/RequireRole.tsx
git commit -m "feat(auth): RequireRole route guard"
```

---

### Task 6: `SuperLayout` + rutas `/admin/super/*`

**Files:**
- Create: `src/components/layout/SuperLayout.tsx`
- Modify: `src/app/router.tsx`

**Interfaces:**
- Consumes: `RequireRole` (Task 5), `useAuth`, `useTheme`, `Button`, `RoleBadge`, `Spinner`; páginas `SuperCenters` (Task 7) y `SuperCategories` (Task 8).
- Produces: ruta `/admin/super` con hijos `centros` y `categorias`; `SuperLayout` (sin props).

- [ ] **Step 1: Crear `SuperLayout` (patrón de AdminLayout, navegación propia)**

```tsx
import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { Building2, Tags, LogOut, Menu, X, Shield, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui';
import { RoleBadge } from '@/components/ui/Badge';

/* ===========================================================================
   Layout del panel de superadmin. Rutas separadas del panel de centro; el
   acceso lo controla <RequireRole role="superadmin"> en el router.
   ========================================================================== */

const NAV = [
  { to: '/admin/super/centros', label: 'Centros', icon: Building2 },
  { to: '/admin/super/categorias', label: 'Categorías', icon: Tags },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 font-body text-sm font-semibold transition',
              isActive ? 'bg-rojo text-white' : 'text-body hover:bg-surface-2 hover:text-ink',
            )
          }
        >
          <Icon className="h-5 w-5 shrink-0" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function SuperLayout() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const Brand = (
    <Link to="/admin/super/centros" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-rojo text-white">
        <Shield className="h-5 w-5" aria-hidden />
      </span>
      <span className="font-display text-h3 font-black tracking-snug text-ink">Unidos</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-bg lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line-soft bg-surface p-4 lg:flex">
        <div className="mb-6">{Brand}</div>
        <div className="mb-4 rounded-lg bg-surface-2 p-3">
          <p className="font-display text-sm font-black tracking-snug text-ink">
            {profile?.full_name ?? 'Superadmin'}
          </p>
          <div className="mt-2">
            <RoleBadge role="superadmin" />
          </div>
        </div>
        <NavItems />
        <div className="mt-auto flex flex-col gap-2 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            leftIcon={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          >
            {theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} leftIcon={<LogOut className="h-4 w-4" />}>
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line-soft bg-surface px-4 py-3 lg:hidden">
          {Brand}
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-ink"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {mobileOpen && (
          <div className="border-b border-line-soft bg-surface px-4 py-4 lg:hidden">
            <NavItems onNavigate={() => setMobileOpen(false)} />
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" size="sm" onClick={toggleTheme} className="flex-1"
                leftIcon={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}>
                {theme === 'dark' ? 'Claro' : 'Oscuro'}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="flex-1"
                leftIcon={<LogOut className="h-4 w-4" />}>
                Salir
              </Button>
            </div>
          </div>
        )}

        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Cablear las rutas en `src/app/router.tsx`**

Añadir imports al inicio (junto a los demás):
```tsx
import { SuperLayout } from '@/components/layout/SuperLayout';
import { RequireRole } from '@/components/layout/RequireRole';
import { SuperCenters } from '@/pages/super/SuperCenters';
import { SuperCategories } from '@/pages/super/SuperCategories';
```

Insertar esta ruta en el array de `createBrowserRouter`, justo después del bloque `/admin`:
```tsx
  {
    path: '/admin/super',
    element: (
      <RequireRole role="superadmin">
        <SuperLayout />
      </RequireRole>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/super/centros" replace /> },
      { path: 'centros', element: <SuperCenters /> },
      { path: 'categorias', element: <SuperCategories /> },
    ],
  },
```

> Nota: las rutas se declaran antes de existir las páginas; crea archivos stub mínimos si ejecutas fuera de orden, pero el orden natural es Task 7 y 8 antes de typecheckear este paso. Para mantener cada tarea verificable, deja el cableado del router aquí y crea las páginas en Task 7/8; typecheck final de este paso se valida tras Task 8.

- [ ] **Step 3: Verificar typecheck (tras crear las páginas en Task 7 y 8)**

Run: `npm run typecheck`
Expected: PASS una vez existan `SuperCenters` y `SuperCategories`. Si ejecutas en orden, hazlo después de Task 8.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/SuperLayout.tsx src/app/router.tsx
git commit -m "feat(routing): superadmin layout and /admin/super routes"
```

---

### Task 7: Página `SuperCenters`

**Files:**
- Create: `src/pages/super/SuperCenters.tsx`

**Interfaces:**
- Consumes: `getAllCenters`, `approveCenter`, `setCenterVerified`, `deleteCenter`, `updateCenterAdmin`, `adminRegisterCenter`, `CenterPatch`, `AdminRegisterCenterInput` (Task 3); `forwardGeocode` (de `@/lib/geo`); `useQuery`, `useMutation`; DS (`Button`, `Card`, `Badge`, `VerifiedBadge`, `CenterStatusBadge`, `Modal`, `Input`, `QueryBoundary`, `EmptyState`).
- Produces: `SuperCenters(): JSX.Element` (export nombrado).

Comportamiento: lista todos los centros, separa pendientes (`is_approved === false`) de aprobados. Pendientes: Aprobar / Rechazar (eliminar). Aprobados: toggle Verificado + Editar. Botón "Registrar centro" abre modal con geocodificación de la dirección.

- [ ] **Step 1: Crear la página**

```tsx
import { useState, type FormEvent } from 'react';
import { Building2, Plus, Check, Trash2, Pencil, BadgeCheck } from 'lucide-react';
import type { Center } from '@/types';
import {
  getAllCenters,
  approveCenter,
  setCenterVerified,
  deleteCenter,
  updateCenterAdmin,
  adminRegisterCenter,
  type CenterPatch,
} from '@/lib/api/centers';
import { forwardGeocode } from '@/lib/geo';
import { useQuery } from '@/lib/hooks/useQuery';
import { useMutation } from '@/lib/hooks/useMutation';
import {
  Button,
  Card,
  Modal,
  Input,
  QueryBoundary,
  EmptyState,
  CenterStatusBadge,
  VerifiedBadge,
} from '@/components/ui';

/* ===========================================================================
   Panel de superadmin · gestión de centros: aprobar/rechazar pendientes,
   verificar, editar datos/coords y registrar centros huérfanos (sin admin).
   ========================================================================== */

type FormState = {
  name: string;
  organization: string;
  address: string;
  schedule: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  website: string;
  email: string;
};

const EMPTY_FORM: FormState = {
  name: '', organization: '', address: '', schedule: '',
  phone: '', whatsapp: '', instagram: '', website: '', email: '',
};

function fromCenter(c: Center): FormState {
  return {
    name: c.name, organization: c.organization, address: c.address,
    schedule: c.schedule, phone: c.phone ?? '', whatsapp: c.whatsapp ?? '',
    instagram: c.instagram ?? '', website: c.website ?? '', email: c.email ?? '',
  };
}

export function SuperCenters() {
  const centers = useQuery(getAllCenters, []);
  const approve = useMutation(approveCenter);
  const remove = useMutation(deleteCenter);
  const verify = useMutation((args: { id: string; value: boolean }) =>
    setCenterVerified(args.id, args.value),
  );
  const create = useMutation(adminRegisterCenter);
  const update = useMutation((args: { id: string; patch: CenterPatch }) =>
    updateCenterAdmin(args.id, args.patch),
  );

  // null = cerrado, 'new' = alta, Center = edición.
  const [editing, setEditing] = useState<Center | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const busy = create.loading || update.loading;

  function openNew() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing('new');
  }
  function openEdit(c: Center) {
    setForm(fromCenter(c));
    setFormError(null);
    setEditing(c);
  }
  function close() {
    setEditing(null);
  }
  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.organization.trim() || !form.address.trim()) {
      setFormError('Nombre, organización y dirección son obligatorios.');
      return;
    }
    try {
      const coords = await forwardGeocode(form.address);
      if (editing === 'new') {
        if (!coords) {
          setFormError('No se pudo ubicar la dirección. Revísala e intenta de nuevo.');
          return;
        }
        await create.mutate({
          name: form.name, organization: form.organization, address: form.address,
          schedule: form.schedule, phone: form.phone, whatsapp: form.whatsapp,
          instagram: form.instagram, website: form.website, email: form.email,
          lat: coords.lat, lng: coords.lng, isApproved: true,
        });
      } else if (editing && editing !== 'new') {
        const patch: CenterPatch = {
          name: form.name.trim(), organization: form.organization.trim(),
          address: form.address.trim(), schedule: form.schedule.trim(),
          phone: form.phone.trim() || null, whatsapp: form.whatsapp.trim() || null,
          instagram: form.instagram.trim() || null, website: form.website.trim() || null,
          email: form.email.trim() || null,
        };
        // Re-geocodifica solo si la dirección cambió y se pudo ubicar.
        if (coords && form.address.trim() !== editing.address) {
          patch.lat = coords.lat;
          patch.lng = coords.lng;
        }
        await update.mutate({ id: editing.id, patch });
      }
      close();
      centers.refetch();
    } catch {
      // El error ya queda en create.error / update.error; muestra genérico.
      setFormError('No se pudo guardar. Intenta de nuevo.');
    }
  }

  async function onApprove(id: string) {
    await approve.mutate(id);
    centers.refetch();
  }
  async function onReject(id: string) {
    await remove.mutate(id);
    centers.refetch();
  }
  async function onToggleVerified(c: Center) {
    await verify.mutate({ id: c.id, value: !c.is_verified });
    centers.refetch();
  }

  const all = centers.data ?? [];
  const pending = all.filter((c) => !c.is_approved);
  const approved = all.filter((c) => c.is_approved);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-h2 font-black text-ink">Centros</h1>
          <p className="font-body text-sm text-muted">
            Aprueba, verifica y mantén la red de centros de acopio.
          </p>
        </div>
        <Button onClick={openNew} leftIcon={<Plus className="h-4 w-4" />}>
          Registrar centro
        </Button>
      </header>

      <QueryBoundary
        loading={centers.loading}
        error={centers.error}
        onRetry={centers.refetch}
        loadingLabel="Cargando centros…"
      >
        {/* Pendientes */}
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-h3 font-black text-ink">
            Pendientes ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" />}
              title="Sin centros pendientes"
              description="Cuando alguien registre un centro, aparecerá aquí para aprobarlo."
            />
          ) : (
            pending.map((c) => (
              <Card key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-display text-base font-black text-ink">{c.name}</p>
                  <p className="font-body text-sm text-muted">{c.organization} · {c.address}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onApprove(c.id)}
                    leftIcon={<Check className="h-4 w-4" />}>Aprobar</Button>
                  <Button size="sm" variant="ghost" onClick={() => onReject(c.id)}
                    leftIcon={<Trash2 className="h-4 w-4" />}>Rechazar</Button>
                </div>
              </Card>
            ))
          )}
        </section>

        {/* Aprobados */}
        <section className="mt-6 flex flex-col gap-3">
          <h2 className="font-display text-h3 font-black text-ink">
            Aprobados ({approved.length})
          </h2>
          {approved.map((c) => (
            <Card key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="font-display text-base font-black text-ink">{c.name}</p>
                  {c.is_verified && <VerifiedBadge variant="icon" />}
                  <CenterStatusBadge status={c.status} />
                </div>
                <p className="font-body text-sm text-muted">{c.organization} · {c.address}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={c.is_verified ? 'secondary' : 'primary'}
                  onClick={() => onToggleVerified(c)}
                  leftIcon={<BadgeCheck className="h-4 w-4" />}>
                  {c.is_verified ? 'Quitar sello' : 'Verificar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(c)}
                  leftIcon={<Pencil className="h-4 w-4" />}>Editar</Button>
              </div>
            </Card>
          ))}
        </section>
      </QueryBoundary>

      <Modal
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? 'Registrar centro' : 'Editar centro'}
        subtitle={editing === 'new'
          ? 'Centro huérfano: queda aprobado y visible al público.'
          : 'Corrige datos o coordenadas (re-geocodifica al cambiar la dirección).'}
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Input label="Nombre" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <Input label="Organización" value={form.organization} onChange={(e) => set('organization', e.target.value)} />
          <Input label="Dirección" value={form.address} onChange={(e) => set('address', e.target.value)} />
          <Input label="Horario" value={form.schedule} onChange={(e) => set('schedule', e.target.value)} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Teléfono" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
            <Input label="Instagram" value={form.instagram} onChange={(e) => set('instagram', e.target.value)} />
            <Input label="Sitio web" value={form.website} onChange={(e) => set('website', e.target.value)} />
          </div>
          <Input label="Correo" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          {formError && <p className="font-body text-sm text-danger-ink">{formError}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close} disabled={busy}>Cancelar</Button>
            <Button type="submit" loading={busy}>
              {editing === 'new' ? 'Registrar' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS. (`Button` acepta `loading` y variantes `primary|secondary|ghost|danger`; verificado contra `src/components/ui/Button.tsx`.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/super/SuperCenters.tsx
git commit -m "feat(super): centers management page (approve/verify/edit/register)"
```

---

### Task 8: Página `SuperCategories`

**Files:**
- Create: `src/pages/super/SuperCategories.tsx`

**Interfaces:**
- Consumes: `getCategories` (existente), `createCategory`, `updateCategory`, `deleteCategory` (Task 4); `useQuery`, `useMutation`; DS (`Button`, `Card`, `Modal`, `Input`, `QueryBoundary`, `EmptyState`).
- Produces: `SuperCategories(): JSX.Element` (export nombrado).

- [ ] **Step 1: Crear la página**

```tsx
import { useState, type FormEvent } from 'react';
import { Tags, Plus, Pencil, Trash2 } from 'lucide-react';
import type { Category } from '@/types';
import { getCategories } from '@/lib/api/categories';
import { createCategory, updateCategory, deleteCategory } from '@/lib/api/categories';
import { useQuery } from '@/lib/hooks/useQuery';
import { useMutation } from '@/lib/hooks/useMutation';
import { Button, Card, Modal, Input, QueryBoundary, EmptyState } from '@/components/ui';

/* ===========================================================================
   Panel de superadmin · catálogo de categorías (insumos). CRUD simple.
   ========================================================================== */

export function SuperCategories() {
  const cats = useQuery(getCategories, []);
  const create = useMutation(createCategory);
  const update = useMutation((args: { id: string; name: string; unit: string }) =>
    updateCategory(args.id, { name: args.name, unit: args.unit }),
  );
  const remove = useMutation(deleteCategory);

  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const busy = create.loading || update.loading;

  function openNew() {
    setName('');
    setUnit('');
    setFormError(null);
    setEditing('new');
  }
  function openEdit(c: Category) {
    setName(c.name);
    setUnit(c.unit);
    setFormError(null);
    setEditing(c);
  }
  function close() {
    setEditing(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !unit.trim()) {
      setFormError('Nombre y unidad son obligatorios.');
      return;
    }
    try {
      if (editing === 'new') {
        await create.mutate({ name, unit });
      } else if (editing && editing !== 'new') {
        await update.mutate({ id: editing.id, name, unit });
      }
      close();
      cats.refetch();
    } catch {
      setFormError('No se pudo guardar. Intenta de nuevo.');
    }
  }

  async function onDelete(c: Category) {
    try {
      await remove.mutate(c.id);
      cats.refetch();
    } catch {
      // remove.error muestra el detalle (p. ej. categoría con ítems asociados).
    }
  }

  const list = cats.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-h2 font-black text-ink">Categorías</h1>
          <p className="font-body text-sm text-muted">Catálogo controlado de insumos.</p>
        </div>
        <Button onClick={openNew} leftIcon={<Plus className="h-4 w-4" />}>Nueva categoría</Button>
      </header>

      {remove.error && (
        <p className="font-body text-sm text-danger-ink">{remove.error.message}</p>
      )}

      <QueryBoundary
        loading={cats.loading}
        error={cats.error}
        onRetry={cats.refetch}
        loadingLabel="Cargando categorías…"
      >
        {list.length === 0 ? (
          <EmptyState
            icon={<Tags className="h-6 w-6" />}
            title="Sin categorías"
            description="Crea la primera categoría de insumos."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {list.map((c) => (
              <Card key={c.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-display text-base font-black text-ink">{c.name}</p>
                  <p className="font-body text-sm text-muted">Unidad: {c.unit}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}
                    leftIcon={<Pencil className="h-4 w-4" />}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(c)}
                    leftIcon={<Trash2 className="h-4 w-4" />}>Eliminar</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>

      <Modal
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? 'Nueva categoría' : 'Editar categoría'}
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Unidad" hint="Ej. litros, unidades, kg"
            value={unit} onChange={(e) => setUnit(e.target.value)} />
          {formError && <p className="font-body text-sm text-danger-ink">{formError}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close} disabled={busy}>Cancelar</Button>
            <Button type="submit" loading={busy}>{editing === 'new' ? 'Crear' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck (valida también el router de Task 6)**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Build completo**

Run: `npm run build`
Expected: compila sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/pages/super/SuperCategories.tsx
git commit -m "feat(super): category CRUD page"
```

---

### Task 9: Verificación manual end-to-end

**Files:** ninguno (verificación).

- [ ] **Step 1: Levantar la app**

Run: `npm run dev`

- [ ] **Step 2: Con un usuario `admin` normal (rol admin)**

- Navegar a `/admin/super` → redirige a `/admin` (guard funciona).

- [ ] **Step 3: Con el usuario `superadmin` sembrado en Task 1**

- `/admin/super/centros` carga; pendientes y aprobados se listan.
- Aprobar un pendiente → desaparece de Pendientes, aparece en Aprobados y en el mapa público (`/`).
- Verificar un aprobado → sello visible en la tarjeta pública.
- Editar coords/datos → cambios persistidos (recargar).
- Registrar centro huérfano → queda aprobado y visible al público.
- Rechazar un pendiente → desaparece (eliminado).
- `/admin/super/categorias`: crear, editar y eliminar una categoría; eliminar una con ítems asociados muestra el error de FK.

- [ ] **Step 4: Actualizar CONTEXTO.md**

Marcar en `docs/CONTEXTO.md §7.A` el flujo de superadmin como hecho (aprobación, verificación, edición, huérfanos, categorías; invitación por correo sigue pendiente).

- [ ] **Step 5: Commit**

```bash
git add docs/CONTEXTO.md
git commit -m "docs: mark superadmin approval flow as done"
```

---

## Notas de verificación

- El RPC `admin_register_center` falla con "Solo un superadmin puede registrar centros" si lo llama un no-superadmin: esperado.
- `deleteCategory` falla si la categoría tiene `donation_items` (FK `ON DELETE RESTRICT`): el mensaje de error de PostgREST se muestra al usuario.
