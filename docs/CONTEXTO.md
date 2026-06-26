# Contexto del proyecto

**Plataforma de Centros de Acopio · Venezuela · sin fines de lucro**
Última actualización: 26 de junio de 2026 · backend Supabase conectado

---

## 1. Qué es

Web pública (sin login) que, tras el terremoto del 24-jun-2026, permite a cualquier
ciudadano encontrar el **centro de acopio activo más cercano** para ir a donar, y da a
cada centro una herramienta interna mínima para registrar donaciones. Ver `PRD.md`.

## 2. Stack real (implementado)

| Capa | Tecnología |
|------|-----------|
| UI | React + Vite + TypeScript |
| Estilos | Tailwind CSS (design system propio con tokens `ink`/`azul`/`rojo`/`amarillo`) |
| Mapa | Leaflet sobre OpenStreetMap |
| Routing | react-router-dom |
| Iconos | lucide-react |
| Datos | **Supabase real** (PostgreSQL + Auth + RLS) vía `@supabase/supabase-js` |
| Acceso a datos | Repositorios en `src/lib/api/*` + hooks `useQuery`/`useMutation` |
| Escrituras | RPCs transaccionales (`create_donation`, `register_center`) |

> La app consume datos reales de Supabase. La UI nunca llama al cliente directo:
> pasa por los repositorios (`src/lib/api/`) y los hooks. El modelo de tipos
> (`src/types/index.ts`) es espejo del esquema (ver `REQUISITOS-TECNICOS.md`).
>
> **Config:** `.env` define `NEXT_PUBLIC_SUPABASE_URL` y
> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Vite los expone vía `envPrefix`).
> Las migraciones viven en `supabase/migrations/` — aplicar con `supabase db push`.

## 3. Estructura del código

```
src/
  pages/
    PublicHome.tsx        Vista pública (mapa + lista + cercanía + detalle de centro)
    CenterRegister.tsx    Registro de centro
    admin/                Panel privado por centro
  components/
    ui/                   Primitivas del DS: Button, Card, Badge, Modal, Input…
    domain/               Componentes de dominio: CenterCard, CenterDetailModal, charts…
    map/CenterMap.tsx     Mapa Leaflet con pines + posición del usuario
  lib/
    supabase.ts           Cliente Supabase (singleton, lee env)
    auth.tsx              AuthProvider/useAuth (sesión + perfil + centro) + guard
    api/                  Repositorios: centers, categories, donations, auth
                          + errors (ApiError) y retry (backoff)
    hooks/                useQuery / useMutation (loading, error, reintento)
    geo.ts                Haversine, cercanía, geocoding directo/inverso (Nominatim)
    stats.ts              Agregados para gráficos públicos/privados
    donation-form.ts, theme.tsx, utils.ts
  types/index.ts          Tipos compartidos (espejo del esquema Supabase)
supabase/
  migrations/             Esquema base, alineación UI y RPCs transaccionales
```

## 4. Funcionalidades de la vista pública (estado)

- ✅ Mapa Leaflet con pines de centros aprobados.
- ✅ **Mi ubicación** (GPS real del navegador; requiere contexto seguro https/localhost).
- ✅ **Centro más cercano** resaltado (cálculo Haversine en el dispositivo; la ubicación
  del visitante no se persiste — PRD §7).
- ✅ **Ubicación dinámica en el header** vía reverse-geocoding (Nominatim/OSM) según la
  posición detectada; fallback a la zona del centro más cercano.
- ✅ **Distancia por tarjeta** desde la ubicación actual (ej. "a 850 m").
- ✅ **Ver detalles** del centro: modal con teléfono, WhatsApp, Instagram, web, horario,
  dirección, insumos urgentes y "Cómo llegar".
- ✅ **Sello de centro/organización verificada** (check) en tarjeta y detalle.
- ✅ Gráfico público por categoría (solo porcentajes).

## 5. Reglas que NO se rompen (privacidad — PRD §7)

- El público nunca ve cantidades exactas, nombres de donantes ni marcas comerciales.
- La ubicación del ciudadano se usa solo en el dispositivo; no se almacena ni se envía a
  un backend propio. El reverse-geocoding consulta solo OSM/Nominatim con las coordenadas.
- Donantes pueden ser anónimos.

## 6. Hecho

- ✅ Conexión a Supabase real (mock eliminado; RLS activa según TRD §5).
- ✅ Auth real (login, registro de centro vía RPC, sesión + guard de rutas).
- ✅ Panel privado por centro (dashboard, recepción, historial, reporte).
- ✅ Gráfico público de la red leyendo `donation_items` (RLS pública).

## 7. Próximos pasos

### A. Superadmins y aprobación de centros (prioridad)

El rol `superadmin` ya existe en el enum `user_role` y la RLS lo contempla, pero
falta el flujo operativo para usarlo:

1. **Designar superadmins.**
   - Decisión: ¿basta el campo `profiles.role = 'superadmin'`, o se crea una
     tabla dedicada `superadmins` (p. ej. `superadmins(id uuid PK → profiles.id,
     granted_by, granted_at)`)?
   - Recomendado para MVP: reutilizar `profiles.role`; una tabla aparte solo si se
     necesita auditoría de quién otorgó el rol. Documentar la decisión aquí.
   - Sembrar el primer superadmin a mano (SQL en Supabase): `UPDATE profiles SET
     role = 'superadmin' WHERE id = '<auth-user-id>';`.

2. **Alta de un nuevo admin.**
   - Flujo para que un superadmin cree/invite admins y los asigne a un centro.
   - Opciones: invitación por correo (Supabase Auth admin API en una Edge
     Function con `service_role`) o auto-registro + asignación manual.
   - Necesita RPC/Edge Function con privilegios elevados (no exponer
     `service_role` en el cliente).

3. **Panel de superadmin (`/admin/...`).**
   - Listar centros pendientes (`is_approved = false`) y **aprobar/rechazar**
     (set `is_approved = true`); RLS de UPDATE ya permite a superadmin.
   - Marcar `is_verified` (sello de organización autorizada).
   - Editar coordenadas/datos de un centro (corregir geocoding del registro).
   - Gestionar categorías (solo superadmin, política ya existe).
   - Gestionar admins y centros (ver punto 2).
   - Añadir guard por rol: separar rutas de superadmin del panel de centro.

### B. Resiliencia y producto

- Realtime opcional del stock en el dashboard (TRD §6 Módulo 3).
- PWA / cola offline para registrar donaciones sin conexión.
- Filtros del mapa por insumo/zona/estado.
- Observabilidad: logging de errores (Sentry capa gratuita).
- Recuperación de contraseña (Supabase) en la UI.

> Detalle de producto en `PRD.md`; detalle técnico y modelo de datos en
> `REQUISITOS-TECNICOS.md`.
