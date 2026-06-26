# Diseño: Superadmins y aprobación de centros

Fecha: 2026-06-26 · Estado: aprobado para implementar

## 1. Objetivo

Habilitar el flujo operativo del rol `superadmin` (ya existente en el enum
`user_role` y contemplado por RLS) para:

- Aprobar / rechazar centros pendientes (`is_approved`).
- Marcar el sello de organización verificada (`is_verified`).
- Editar datos/coordenadas de un centro (corregir geocoding).
- Registrar **centros huérfanos** vistos en redes sociales (sin usuario admin),
  para centralizar la información.
- Gestionar el catálogo de categorías (CRUD).

## 2. Decisiones de alcance

| Decisión | Elección | Razón |
|----------|----------|-------|
| Almacenamiento del rol | `profiles.role = 'superadmin'` | Reutiliza el enum existente; sin tabla nueva. Sembrar el primero por SQL manual. |
| Alta de admins de centro | **Fuera de alcance** | Solo centros huérfanos (sin usuario). Evita Edge Functions / `service_role`. |
| Separación de rutas | Nuevas rutas `/admin/super/*` con guard por rol | Mantiene el panel de centro intacto; no mezcla roles en un layout. |
| Tabla `superadmins` dedicada | No | No se requiere auditoría de quién otorgó el rol en el MVP. |

**Explícitamente fuera de alcance:** invitación por correo, Edge Functions,
exponer `service_role`, tabla `superadmins`, gestión de admins/usuarios.

## 3. Capa de datos (una migración nueva)

Archivo: `supabase/migrations/<ts>_superadmin_flows.sql`. Aplicar con
`supabase db push`.

### 3.1 Arreglo de la política de `categories`

La política actual `"Solo superadmins modifican categorías"` define solo `USING`
(sin `WITH CHECK`). En PostgreSQL, `USING` no aplica a `INSERT`, por lo que un
`INSERT` de categoría queda bloqueado aunque el llamante sea superadmin. Se
reemplaza por una política con `USING` **y** `WITH CHECK` para que
INSERT/UPDATE/DELETE funcionen para superadmin.

```sql
DROP POLICY IF EXISTS "Solo superadmins modifican categorías" ON public.categories;

CREATE POLICY "Solo superadmins modifican categorías"
  ON public.categories
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = 'superadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p
                      WHERE p.id = auth.uid() AND p.role = 'superadmin'));
```

### 3.2 Política DELETE en `centers` (para "rechazar")

`centers` no tiene política DELETE. "Rechazar" un centro huérfano = borrarlo.
Solo superadmin.

```sql
CREATE POLICY "Superadmins eliminan centros"
  ON public.centers
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = 'superadmin'));
```

### 3.3 RPC `admin_register_center` (SECURITY DEFINER)

El alta directa por cliente está limitada por la política
`"Registro de nuevo centro"` (`WITH CHECK is_approved = false`), así que el
superadmin no puede insertar un centro ya aprobado por la vía normal. RPC
`SECURITY DEFINER` que verifica el rol y permite fijar `is_approved`/
`is_verified`. No crea perfil ni asigna admin.

```sql
CREATE OR REPLACE FUNCTION public.admin_register_center(
  p_name text, p_organization text, p_address text, p_schedule text,
  p_phone text, p_whatsapp text, p_instagram text, p_website text, p_email text,
  p_lat double precision, p_lng double precision,
  p_is_approved boolean DEFAULT true,
  p_is_verified boolean DEFAULT false
) RETURNS uuid
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE v_center_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles
                 WHERE id = auth.uid() AND role = 'superadmin') THEN
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

REVOKE ALL ON FUNCTION public.admin_register_center(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_register_center(...) TO authenticated;
```

### 3.4 Sin cambios necesarios

- **SELECT de todos los centros para superadmin:** ya cubierto. La política
  `"Usuarios ven su propio centro"` incluye `OR EXISTS(... role = 'superadmin')`,
  que es independiente de la fila → el superadmin lee todos los centros
  (incluidos los pendientes).
- **UPDATE (aprobar/verificar/editar):** ya cubierto por
  `"Admins modifican su propio centro"`, que también permite a superadmin.

### 3.5 Semilla del primer superadmin

Manual en el SQL editor de Supabase:

```sql
UPDATE public.profiles SET role = 'superadmin' WHERE id = '<auth-user-id>';
```

(Documentar el `id` usado fuera de control de versiones.)

## 4. Tipos (`src/types/index.ts`)

`Profile.center_id` pasa a `string | null` (el superadmin no gestiona un centro).
Auditar usos en `auth.tsx`, `AdminLayout.tsx`, páginas de admin y formularios.

## 5. Capa de API

`src/lib/api/centers.ts` (añadir):

- `getAllCenters(): Promise<Center[]>` — todos los centros (RLS los devuelve a
  superadmin), ordenados: pendientes primero, luego por `created_at`.
- `approveCenter(id): Promise<void>` — `update is_approved = true`.
- `setCenterVerified(id, value): Promise<void>` — `update is_verified`.
- `updateCenterAdmin(id, patch): Promise<Center>` — editar datos/coords.
- `deleteCenter(id): Promise<void>` — rechazar/eliminar.
- `adminRegisterCenter(payload): Promise<string>` — `rpc('admin_register_center')`.

Todas pasan por `fromPostgrestError` + `withRetry` como el resto del repositorio.

`src/lib/api/categories.ts` (añadir):

- `createCategory({ name, unit }): Promise<Category>`
- `updateCategory(id, patch): Promise<Category>`
- `deleteCategory(id): Promise<void>`

## 6. Rutas y guard

- Componente `RequireRole({ role, children })` (o equivalente) que lee
  `useAuth()`: si `status==='loading'` muestra spinner; si no autenticado →
  `/admin/login`; si autenticado pero `profile.role !== 'superadmin'` →
  `/admin`; si OK renderiza.
- En `src/app/router.tsx`, nueva rama:

```
/admin/super        → <SuperLayout> (guard superadmin)
  index             → Navigate to centros
  centros           → <SuperCenters>
  categorias        → <SuperCategories>
```

- `SuperLayout` reutiliza el patrón de `AdminLayout` (sidebar desktop + menú
  mobile, toggle de tema, logout) con su propia navegación (Centros,
  Categorías) y marca visual de "Superadmin".

## 7. Páginas UI

`src/pages/super/SuperCenters.tsx`:

- Carga con `useQuery(getAllCenters)`.
- Sección destacada "Pendientes" (`is_approved === false`) con acciones
  **Aprobar** / **Rechazar**.
- Lista de aprobados con toggle **Verificado** y botón **Editar**.
- Botón **Registrar centro huérfano** → modal con el formulario (reutiliza los
  campos de `CenterRegister`/geocoding de `geo.ts`), llama
  `adminRegisterCenter`.
- Modal **Editar** (coords + datos) → `updateCenterAdmin`. Permite re-geocodificar
  o ajustar lat/lng a mano.
- Mutaciones vía `useMutation`; refrescar la consulta al éxito.

`src/pages/super/SuperCategories.tsx`:

- `useQuery(getCategories)` + tabla con editar/eliminar y formulario de alta.
- Mutaciones `createCategory`/`updateCategory`/`deleteCategory`.

Todo con primitivas del DS existentes (`Button`, `Card`, `Badge`, `Modal`,
`Input`, `Spinner`) y los hooks `useQuery`/`useMutation`. Sin librerías nuevas.

## 8. Manejo de errores

- Errores de RPC/RLS se propagan como `ApiError` (vía `fromPostgrestError`) y se
  muestran con el estado de error de `useMutation`/`useQuery`, igual que el resto
  del panel.
- El guard cubre el acceso indebido en cliente; la RLS y la RPC
  (`RAISE EXCEPTION`) son la barrera real en el servidor.

## 9. Pruebas / verificación

- `supabase db push` aplica la migración sin error.
- Con un usuario `admin` normal: `/admin/super` redirige a `/admin`; los RPC/UPDATE
  de categorías/aprobación fallan por RLS.
- Con un usuario `superadmin`: ve pendientes, aprueba (aparece en mapa público),
  verifica (sello), edita coords, registra huérfano (queda aprobado), CRUD de
  categorías.
- `npm run build` / typecheck en verde tras el cambio de `center_id` a nullable.
