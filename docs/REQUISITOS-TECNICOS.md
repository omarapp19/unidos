# Requerimientos Técnicos — Plataforma de Centros de Acopio

**Documento de Requerimientos Técnicos (TRD)**
Versión 1.0 · 25 de junio de 2026
Complementa a `PRD.md`. Proyecto sin fines de lucro.

---

## 1. Objetivo del documento

Definir la arquitectura, el stack, el modelo de datos, las interfaces y los requisitos no
funcionales necesarios para construir el MVP descrito en el PRD, priorizando **rapidez de
entrega, bajo costo y facilidad de mantenimiento** por un equipo voluntario.

## 2. Stack tecnológico

Acordado por el equipo:

| Capa | Tecnología | Motivo |
|------|-----------|--------|
| Frontend | **React** (con Vite) | Conocido por el equipo, ecosistema amplio, mobile-first. |
| Backend / BaaS | **Supabase** (PostgreSQL + Auth + Storage + Realtime + RLS) | Evita construir backend desde cero; auth, base de datos y reglas de seguridad integradas; capa gratuita suficiente para arrancar. |
| Hosting / Deploy | **Vercel** | Despliegue continuo desde Git, CDN global, capa gratuita. |
| Mapa | Librería de mapas sobre **OpenStreetMap** (p. ej. Leaflet/MapLibre) | Sin costo de licencia, evita facturación de APIs de mapas comerciales. |

> Nota: se descartó un backend propio con Express/Render para no asumir mantenimiento de
> servidor ni costos. Supabase cubre auth, datos, realtime y reglas de acceso.

### Consideraciones de costo (sin fines de lucro)
- Usar capas gratuitas de Supabase y Vercel mientras el volumen lo permita.
- Mapas sobre OpenStreetMap para evitar facturación por uso.
- Dominio y, si se requiere, plan pago mínimo: lo costea el equipo.

## 3. Arquitectura general

```
┌──────────────────────────┐        ┌─────────────────────────────┐
│  Cliente React (Vercel)  │        │          Supabase            │
│                          │  HTTPS │                              │
│  • Vista pública (mapa)  │◀──────▶│  • Auth (centros/admins)     │
│  • Panel de gestión      │  SDK   │  • PostgreSQL + RLS          │
│  • PWA (post-MVP)        │        │  • Realtime (stock en vivo)  │
│                          │        │  • Storage (logos, reportes) │
└──────────────────────────┘        │  • Edge Functions (vistas    │
                                     │    públicas agregadas)       │
                                     └─────────────────────────────┘
```

- El cliente habla **directamente** con Supabase vía SDK; la seguridad se aplica con
  **Row Level Security (RLS)** en PostgreSQL, no en el cliente.
- Las estadísticas públicas se sirven desde **vistas/agregados** que solo exponen
  porcentajes por categoría (nunca filas crudas con cantidades o nombres).
- Geolocalización del ciudadano: se calcula el centro más cercano **en el dispositivo**
  (Haversine) usando la lista de centros; no se almacena la ubicación del visitante.

## 4. Modelo de datos (PostgreSQL / Supabase)

Esquema propuesto para el MVP. Tipos orientativos.

### `centers` — centros de acopio
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | uuid PK | |
| `name` | text | Nombre del centro. |
| `address` | text | Dirección legible. |
| `lat`, `lng` | double precision | Coordenadas para el pin. |
| `phone` | text | Contacto (opcional). |
| `schedule` | text | Horario de recepción. |
| `status` | enum(`receiving`,`full`,`closed`) | Estado operativo. |
| `is_approved` | boolean | Solo aprobados aparecen en público. |
| `organization` | text | Organización autorizante (p. ej. Cruz Roja). |
| `created_at` | timestamptz | |

### `profiles` — administradores
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | uuid PK (= `auth.users.id`) | Vinculado a Supabase Auth. |
| `center_id` | uuid FK → centers | Centro que gestiona. |
| `role` | enum(`admin`,`superadmin`) | Permisos. |
| `full_name` | text | |

### `categories` — categorías de insumos
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | uuid PK | |
| `name` | text | Agua, Granos, Enlatados, Insumos Médicos, etc. |
| `unit` | text | Unidad base (litros, unidades, kg). |

> Categorías controladas (catálogo común) para que las estadísticas globales sean
> comparables entre centros.

### `donations` — donación (un evento por donante)
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | uuid PK | |
| `center_id` | uuid FK → centers | |
| `donor_name` | text NULL | Vacío/NULL ⇒ anónimo. |
| `is_anonymous` | boolean | Derivado de `donor_name`. |
| `created_at` | timestamptz | Sirve para "donantes de hoy" y reportes por periodo. |
| `created_by` | uuid FK → profiles | Quién registró. |

### `donation_items` — productos de cada donación
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | uuid PK | |
| `donation_id` | uuid FK → donations | |
| `category_id` | uuid FK → categories | |
| `product` | text | Tipo/descripción del producto (sin marca obligatoria). |
| `quantity` | numeric | Cantidad. |

### Inventario / stock
El stock por centro y categoría se obtiene **agregando** `donation_items`
(`SUM(quantity) GROUP BY center_id, category_id`). Para el MVP basta una **vista**
(`v_center_stock`); si el volumen crece, materializar o mantener una tabla `stock` con
triggers. No se duplica el dato de origen.

### Vistas públicas agregadas
- `v_public_center_pins`: solo campos no sensibles de centros aprobados (sin inventario).
- `v_public_category_share`: porcentaje donado por categoría a nivel global. **Nunca**
  expone cantidades absolutas, nombres de donantes ni marcas.

## 5. Seguridad — Row Level Security (RLS)

RLS **activado en todas las tablas**. Reglas clave:

- `donations` y `donation_items`: un `admin` solo puede `SELECT/INSERT` filas de **su
  propio** `center_id`; `superadmin` puede ver todo para moderación.
- `centers`: lectura pública limitada a `is_approved = true` y a columnas no sensibles
  (vía vista); escritura del propio centro por su admin; aprobación solo por superadmin.
- Datos sensibles (nombres de donantes, cantidades exactas) **nunca** accesibles por el
  rol anónimo.
- Las estadísticas públicas se sirven **solo** desde vistas agregadas, no desde tablas
  base.
- Secrets y `service_role` jamás en el cliente; el frontend usa solo la `anon key`.

## 6. Requisitos funcionales técnicos por módulo

### Módulo 1 — Vista pública
- Cargar pines desde `v_public_center_pins`; render en mapa (Leaflet/MapLibre + OSM).
- Geolocalización del navegador (con permiso) y cálculo Haversine del centro más cercano
  en el cliente; resaltar ese pin y centrar el mapa.
- Botón "Cómo llegar": deep link a Google/Apple Maps con `lat,lng`.
- Gráfico de participación por categoría desde `v_public_category_share`
  (p. ej. Recharts/Chart.js), mostrando porcentajes.
- Funciona **sin autenticación**.

### Módulo 2 — Autenticación
- Supabase Auth con email + contraseña (mínimo para MVP). Registro crea `profile` y un
  `center` en estado `is_approved = false`.
- Flujo de aprobación: superadmin marca `is_approved = true`.
- Recuperación de contraseña vía Supabase.

### Módulo 3 — Panel de gestión
- **Dashboard:** consultas agregadas del propio centro (donantes hoy, anónimos vs.
  identificados, top categorías, stock por categoría). Suscripción **Realtime** opcional
  para refrescar en vivo.
- **Recepción de productos:** formulario con `donor_name` (opcional), filas dinámicas de
  `category_id` + `product` + `quantity`; un `INSERT` transaccional crea la `donation` y
  sus `donation_items`. Validación de cantidades > 0.
- **Historial y reportes:** tabla paginada de `donations` por periodo, expandible a sus
  ítems. Generación de reporte imprimible (HTML con `@media print`, tamaño carta, B/N) y
  exportable a PDF desde el navegador.

## 7. Requisitos no funcionales

| Atributo | Requisito |
|----------|-----------|
| **Mobile-first** | Diseño responsive; el panel de recepción debe ser cómodo en celular. |
| **Rendimiento** | Carga inicial de la vista pública (mapa + pines) en < 3 s en 4G. Registrar una donación responde en < 1 s. |
| **Disponibilidad** | Apuntar a alta disponibilidad usando la infraestructura gestionada de Supabase/Vercel. |
| **Accesibilidad** | Contraste adecuado, navegación con teclado, etiquetas en formularios; UI en español. |
| **Idioma** | Español (Venezuela). |
| **Escalabilidad** | Diseño multi-centro y preparado para multi-ciudad/región (campo de zona/región a futuro). |
| **Resiliencia de red** | Post-MVP: PWA con cola offline para registrar donaciones sin conexión y sincronizar luego. |
| **Privacidad** | Cumplir las reglas del PRD §7; minimizar datos personales; ubicación del visitante no se persiste. |
| **Observabilidad** | Logs básicos de errores (p. ej. Sentry capa gratuita) y panel de Supabase. |

## 8. Roadmap técnico sugerido

**Fase 0 — Cimientos (día 1–2)**
Repo, proyecto Vite + React, proyecto Supabase, esquema base, despliegue en Vercel,
catálogo de categorías sembrado.

**Fase 1 — MVP crítico**
Módulo 1 (mapa + centro más cercano + fichas) · Módulo 2 (auth + aprobación) ·
Módulo 3.B (recepción) y 3.C (historial + reporte imprimible) · stock por vista.

**Fase 2 — Estadísticas**
Dashboard del centro (3.A) · gráfico público de categorías (1.C) · Realtime de stock.

**Fase 3 — Valor adicional**
Insumos prioritarios + filtros del mapa · estados de capacidad · compartir por WhatsApp ·
sello de centro autorizado · multi-usuario por centro.

**Fase 4 — Resiliencia y escala**
PWA/offline · multi-ciudad/región · estadísticas globales enriquecidas.

## 9. Decisiones abiertas (a confirmar con el equipo)

- Librería de mapa definitiva (Leaflet vs. MapLibre).
- Catálogo inicial de categorías y unidades.
- Criterio formal de "centro autorizado" y quién actúa como superadmin/aprobador.
- Política de retención y borrado de datos de donantes una vez termine la emergencia.

---

*Ver `PRD.md` para el detalle de producto y `propuesta-kevin.md` para la propuesta
funcional original.*
