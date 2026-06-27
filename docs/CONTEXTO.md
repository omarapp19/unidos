# Contexto del proyecto

**Plataforma de Centros de Acopio · Venezuela · sin fines de lucro**
Última actualización: 27 de junio de 2026 · **EN PRODUCCIÓN** → https://centrodeacopiovenezuela.com
(React + Vercel · backend Supabase conectado)

> **Estado:** MVP lanzado el 27-jun-2026. Construido por un equipo de 5 (Omar, Sofía,
> Kevin, Jonathan, Sebastián) en ~1 día tras el terremoto del 24-jun. Ya se difunde
> entre contactos cercanos; falta la difusión masiva (influencers/periodistas) y
> blindar la infra para tráfico alto. **Competencia activa** ya publicó plataformas
> similares — nuestra ventaja: mapa + centro más cercano automático + portal de enlaces.

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
- ✅ **Sugerir centro** sin registro (cualquiera lo propone; queda pendiente de aprobación).
- ✅ **Portal de Ayuda**: página por categorías con enlaces a otras plataformas
  (desaparecidos, reportes de daños, donativos, voluntarios, puntos de ayuda).
  CRUD gestionado por superadmin desde el panel (no hay que editar código).
- ✅ Autocompletado de dirección al registrar (sugerencias + selección) y
  reverse-geocoding de coordenadas → texto (Nominatim/OSM).

## 5. Reglas que NO se rompen (privacidad — PRD §7)

- El público nunca ve cantidades exactas, nombres de donantes ni marcas comerciales.
- La ubicación del ciudadano se usa solo en el dispositivo; no se almacena ni se envía a
  un backend propio. El reverse-geocoding consulta solo OSM/Nominatim con las coordenadas.
- Donantes pueden ser anónimos.

## 6. Hecho

- ✅ Conexión a Supabase real (mock eliminado; RLS activa según TRD §5).
- ✅ Auth real (login, registro de centro vía RPC `register_center`, sesión + guard).
- ✅ Panel privado por centro (dashboard, recepción, historial, reporte).
- ✅ Gráfico público de la red leyendo `donation_items` (RLS pública).
- ✅ **Despliegue en producción** en Vercel con dominio propio
  `centrodeacopiovenezuela.com`.
- ✅ **Superadmin operativo**: login desde el mismo formulario; aprobar/rechazar
  centros, registrar centros, gestionar Portal de Ayuda. Primeros superadmins
  sembrados (Omar, Sofía, Kevin, Jonathan, Sebastián).
- ✅ Carga inicial de datos: >60 centros verificados por CSV + tanda de scraping
  de otra plataforma (pendientes de aprobación uno por uno).
- ✅ Categorías principales sembradas vía migración (incluye insumos médicos).
- ✅ Fix 404 al refrescar rutas profundas; lista de pendientes con scroll y filtros.

> **Flujo git del equipo:** trabajar en rama `develop`, hacer merge a `master` solo
> cuando esté consolidado (cada push a `master` consume minutos de despliegue Vercel).

## 7. Tareas pendientes (por prioridad)

Estamos en producción y a punto de difundir masivamente. Las prioridades reflejan:
(1) que la web no se caiga con tráfico alto, (2) que los datos sean confiables y
abundantes, (3) crecimiento/difusión, (4) mejoras de producto.

### P0 — Crítico antes de difundir masivamente

- **Caching agresivo de la lista de centros.** El flujo será lectura masiva (miles
  buscando centros a la vez). La lista no cambia cada segundo: cachear esa consulta
  (CDN/Vercel y/o capa de query) con TTL de 5–10 min. Mejor datos con delay que un
  Error 500 por conexiones simultáneas. Minimizar consultas a la BD.
- **Optimizar carga de la web (que cargue rápido en redes).** Enlace limpio,
  bundle liviano, imágenes optimizadas, lazy-load del mapa, buen LCP en móvil
  (la mayoría entra desde el teléfono).
- **Monitoreo de límites de capa gratuita (Supabase/Vercel).** Vigilar cuotas
  (lecturas/escrituras BD, ancho de banda). Tener listo el salto a plan Pro en un
  clic antes de que el proveedor corte el servicio (Omar cubre gastos operativos).
- **Esconder gráfico/estadísticas con cantidades exactas.** Hoy muestra cantidades
  numéricas (datos mock); rompe la regla de privacidad (PRD §7: solo porcentajes).
  Ocultar esa sección hasta que el panel de inventario esté listo (fase siguiente).
- **Validar el flujo completo de registro de centro en prod** (eres un centro →
  registra, sugerir centro, y superadmin → registrar centro). Confirmar que la RPC
  `register_center` esté aplicada en Supabase (ya hubo error de "function not found"
  por migraciones sin aplicar — correr `supabase db push`/repair tras cada cambio).

### P1 — Confianza de datos y verificación

- **Poblar la base de datos.** Seguir cargando centros: CSV del equipo, scraping de
  otras plataformas (centrosdeacopiovenezuela.com ~190, redayudavenezuela.com,
  cenital.help) confirmando la info. Pasar a aprobación uno por uno.
- **Verificar/aprobar centros (humano en el loop).** Ningún centro se publica sin
  aprobación de un superadmin (evita troles/datos falsos). Ya hay casos de
  direcciones/coordenadas erróneas del scraping → corregir al aprobar. **Designar
  voluntario(s) dedicados a filtrar** los registros entrantes.
- **Editar coordenadas/datos de un centro desde el panel** (corregir geocoding malo;
  ya se detectaron pines en lugar incorrecto).
- **Recuperación de contraseña** (Supabase) en la UI — varios del equipo tuvieron
  fricción creando/accediendo a usuarios superadmin.

### P2 — Difusión y crecimiento

- **Minikit de difusión:** copy de 3 líneas (corto y al grano) + imagen formato
  Story/Post con el link bien visible + enlace limpio. Pendiente decidir quién lo
  arma y a quién se envía.
- **Estrategia de distribución:** enviar el kit a influencers, periodistas y cuentas
  informativas que ya cubren la emergencia. Empezar por contactos cercanos (ya en
  curso) y escalar cuando la app esté sólida.
- **Logo / identidad.** Hoy se usa un ícono genérico; falta un logo propio.

### P3 — Resiliencia técnica e infraestructura

- **Soportar tráfico alto** (más allá del caching): índices en BD para consultas de
  cercanía/estado, rate limiting básico, plan de escalado.
- **Observabilidad / logging de errores.** Investigado Sentry; ver integración con
  Supabase/Vercel. Panel para ver fallos en tiempo real.
- PWA / cola offline para registrar donaciones sin conexión (cortes de luz frecuentes
  en el equipo y usuarios).

### P4 — Mejoras de producto (siguientes fases)

- **Onboarding / tour de bienvenida** tras registrar un centro (modal o paso a paso
  que explique el panel de gestión).
- **Registro de centro en stepper multipaso** (campos esenciales primero; redes y
  extras al completar perfil después).
- **Marcar insumos como urgentes** (botón estrella) para que el centro ordene/priorice
  lo que más necesita; cambia con el tiempo.
- **Crear categorías desde la interfaz** del admin (las necesidades cambian a diario:
  comida, material médico, etc.).
- Realtime opcional del stock en el dashboard (TRD §6 Módulo 3).
- Filtros del mapa por insumo/zona/estado.
- Tema oscuro (mejor para uso nocturno; pedido por el equipo).
- Sección/redirección de personas desaparecidas (parcialmente cubierto por el Portal
  de Ayuda; evaluar si hace falta botón propio).

> Detalle de producto en `PRD.md`; detalle técnico y modelo de datos en
> `REQUISITOS-TECNICOS.md`. Bugs y faltantes se anotan aquí y se van marcando hechos.
