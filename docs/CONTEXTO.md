# Contexto del proyecto

**Plataforma de Centros de Acopio · Venezuela · sin fines de lucro**
Última actualización: 26 de junio de 2026

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
| Datos (hoy) | **Mock** en `src/lib/mock-data.ts` (simula Supabase; respeta `src/types`) |
| Backend (plan) | Supabase (PostgreSQL + Auth + RLS) — ver `REQUISITOS-TECNICOS.md` |

> Hoy la app corre con datos mock. El modelo de tipos (`src/types/index.ts`) refleja el
> esquema de Supabase del TRD para que migrar sea sustituir el origen de datos.

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
    geo.ts                Haversine, orden por cercanía, reverse-geocoding (Nominatim)
    mock-data.ts          Centros, categorías, donaciones (mock)
    stats.ts              Agregados para gráficos públicos/privados
    store.ts, theme.ts, utils.ts
  types/index.ts          Tipos compartidos (espejo del esquema Supabase)
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

## 6. Pendiente / próximos pasos

- Conectar a Supabase real (sustituir mock; activar RLS según TRD §5).
- Panel privado completo (recepción, historial, reporte imprimible).
- PWA / modo baja conectividad.
- Filtros del mapa por insumo/zona/estado.

> Detalle de producto en `PRD.md`; detalle técnico y modelo de datos en
> `REQUISITOS-TECNICOS.md`.
