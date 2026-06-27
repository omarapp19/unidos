# Cambios rama `sebastian`

## Resumen

Esta rama agrega dos funcionalidades nuevas al proyecto **Unidos**:

1. Sección pública "¿Conoces personas desaparecidas?" en la página principal.
2. CRUD de Recursos de Ayuda en el panel de superadmin.

---

## Commit 1 — Sección personas desaparecidas (página principal + nueva página)

### Archivos modificados

| Archivo | Tipo | Descripción |
|---|---|---|
| `src/pages/PublicHome.tsx` | Modificado | Nuevo enlace en header desktop y mobile |
| `src/pages/PersonasDesaparecidas.tsx` | Nuevo | Página pública `/personas-desaparecidas` |
| `src/app/router.tsx` | Modificado | Ruta `/personas-desaparecidas` registrada |

### Detalle

**`PublicHome.tsx`**
- Se agregó el botón **"¿Conoces personas desaparecidas?"** (color ámbar `bg-amber-600`) en el header junto a "¿Eres un centro?".
- Aplica tanto en la vista desktop como en el menú desplegable mobile.
- Icono: `Users` de lucide-react.
- Enlaza a `/personas-desaparecidas`.

**`PersonasDesaparecidas.tsx`** *(página nueva)*
- Ruta: `/personas-desaparecidas`
- Muestra 4 grupos de recursos con enlaces reales a plataformas de ayuda:
  - Plataformas Ciudadanas (terremoto 2026)
  - Organizaciones Humanitarias
  - Derechos Humanos y Registro
  - Datos Operacionales ONU
- Incluye aviso de emergencia y footer con enlace de vuelta al home.

---

## Commit 2 — URLs reales en PersonasDesaparecidas

Se reemplazaron todos los `href="#"` por URLs verificadas:

| Nombre | URL |
|---|---|
| Desaparecidos Venezuela | https://www.desaparecidosvenezuela.com/ |
| CICR – Restoring Family Links Venezuela | https://familylinks.icrc.org/organization/venezuelan-red-cross |
| Cruz Roja Venezolana | https://cruzroja.ve/ |
| ACNUR Venezuela | https://help.unhcr.org/venezuela/ |
| PROVEA | https://provea.org/ |
| Foro Penal | https://foropenal.com/ |
| Portal Situación Venezuela – ACNUR | https://data.unhcr.org/en/situations/vensit |
| CICR en Venezuela | https://www.icrc.org/en/where-we-work/venezuela |

---

## Commit 3 — CRUD Recursos de Ayuda (superadmin)

### Archivos nuevos/modificados

| Archivo | Tipo | Descripción |
|---|---|---|
| `supabase/migrations/20260626210000_help_resources.sql` | Nuevo | Tablas BD + seed |
| `src/types/index.ts` | Modificado | Tipos `HelpCategory` y `HelpLink` |
| `src/lib/api/helpResources.ts` | Nuevo | CRUD API contra Supabase |
| `src/pages/super/SuperHelpResources.tsx` | Nuevo | Página CRUD dos paneles |
| `src/components/layout/SuperLayout.tsx` | Modificado | Nuevo ítem nav "Recursos de Ayuda" |
| `src/app/router.tsx` | Modificado | Ruta `/admin/super/recursos` |

### Base de datos

Se crean dos tablas con RLS habilitado:

**`help_categories`**
```
id          uuid  PK
name        text  UNIQUE NOT NULL
created_at  timestamptz
```

**`help_links`**
```
id           uuid  PK
category_id  uuid  FK → help_categories(id) ON DELETE CASCADE
label        text  NOT NULL
description  text
href         text  NOT NULL
sort_order   integer
created_at   timestamptz
```

**Políticas RLS:**
- Lectura: pública (anon puede leer).
- Escritura: solo usuarios con `role = 'superadmin'` en `profiles`.

**Seed inicial:**
- Categorías: `Desaparecidos`, `Reportes de daños`, `Donativos`, `Personal de ayuda`, `Puntos de ayuda`.
- 8 enlaces precargados en la categoría `Desaparecidos` (los mismos de la página pública).

### Panel superadmin — `/admin/super/recursos`

Interfaz de dos paneles:

```
┌──────────────────────┬───────────────────────────────────────┐
│ CATEGORÍAS           │ ENLACES · Desaparecidos   [+ Enlace]  │
│                      │                                       │
│ ▶ Desaparecidos      │ ┌─────────────────────────────────┐   │
│   Reportes de daños  │ │ Desaparecidos Venezuela   ✏️ 🗑️ │   │
│   Donativos          │ │ desaparecidosvenezuela.com      │   │
│   Personal de ayuda  │ ├─────────────────────────────────┤   │
│   Puntos de ayuda    │ │ CICR – Restoring Family Links   │   │
│                      │ │ familylinks.icrc.org/...        │   │
│ [+ Nueva categoría]  │ └─────────────────────────────────┘   │
└──────────────────────┴───────────────────────────────────────┘
```

**Funcionalidades:**
- Crear / editar / eliminar categorías.
- Seleccionar una categoría para ver y gestionar sus enlaces.
- Crear / editar / eliminar enlaces (nombre, descripción, URL).
- Eliminación de categoría borra sus enlaces en cascada (ON DELETE CASCADE en BD).

### Aplicar la migración en Supabase

```bash
# Desde la carpeta unidos/
npx supabase db push
# o desde el dashboard de Supabase: SQL Editor → pegar el contenido de la migración
```

---

## Próximos pasos sugeridos

- Conectar `PersonasDesaparecidas.tsx` para que lea los enlaces desde la BD en lugar de estar hardcodeados (tabla `help_links` WHERE `help_categories.name = 'Desaparecidos'`).
- Crear páginas públicas para las otras 4 categorías (Reportes de daños, Donativos, etc.) siguiendo el mismo patrón.
- Agregar campo `icon` a `help_categories` para mostrar íconos distintos por categoría.
