import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation, MapPin, BarChart3, Search, Sun, Moon, Building2 } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import {
  approvedCenters,
  urgentSuppliesByCenter,
  categories,
} from '@/lib/mock-data';
import { nearest, sortByDistance, formatDistance, reverseGeocode, type LatLng } from '@/lib/geo';
import { categoryTotals } from '@/lib/stats';
import { useData } from '@/lib/store';
import type { Center } from '@/types';
import { Button, Card, Badge, Input, EmptyState, Spinner } from '@/components/ui';
import {
  CenterCard,
  CenterDetailModal,
  CategoryBar,
  type CategoryBarColor,
} from '@/components/domain';
import { CenterMap } from '@/components/map/CenterMap';

/* ===========================================================================
   Vista pública / Home (PRD Módulo 1 · Propuesta 02 "Vista A").
   La LISTA manda; el mapa es apoyo. Sin login.
   - Buscador por nombre/zona + botón "Mi ubicación".
   - Lista de centros (más cercano resaltado con barra tricolor) + mapa Leaflet.
   - Gráfico general de la red por categoría (solo porcentajes, §1.C).
   ========================================================================== */

const BAR_COLORS: CategoryBarColor[] = ['azul', 'amarillo', 'rojo', 'success'];

/** Cuántos centros (además del destacado) se cargan por tanda al scrollear. */
const PAGE_SIZE = 6;

/** Zona mostrada en el header antes de detectar la ubicación del visitante. */
const DEFAULT_LOCATION = 'Chacao, Caracas';

type GeoState = 'idle' | 'loading' | 'granted' | 'denied';

/** Barra tricolor de marca (amarillo · azul · rojo). */
function Tricolor({ className = '' }: { className?: string }) {
  return (
    <div className={`flex h-1.5 w-full overflow-hidden rounded-full ${className}`}>
      <span className="flex-1 bg-amarillo" />
      <span className="flex-1 bg-azul" />
      <span className="flex-1 bg-rojo" />
    </div>
  );
}

export function PublicHome() {
  const { theme, toggleTheme } = useTheme();
  const { donations, donationItems } = useData();
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [geoState, setGeoState] = useState<GeoState>('idle');
  const [geoError, setGeoError] = useState<string | null>(null);
  // Zona detectada (reverse-geocoding) que se muestra en el header. Por defecto, la
  // ciudad base del proyecto hasta que el usuario comparta su ubicación.
  const [locationLabel, setLocationLabel] = useState<string>(DEFAULT_LOCATION);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<LatLng | null>(null);
  const [query, setQuery] = useState('');
  // Centro abierto en la ficha ampliada (contacto + redes). `null` = modal cerrado.
  const [detailCenter, setDetailCenter] = useState<Center | null>(null);

  // Centros ordenados por cercanía (si hay ubicación) y filtrados por búsqueda.
  const ranked = useMemo(() => {
    const base = userPos
      ? sortByDistance(userPos, approvedCenters).map(({ item, km }) => ({ item, km }))
      : approvedCenters.map((c) => ({ item: c, km: null as number | null }));
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      ({ item }) =>
        item.name.toLowerCase().includes(q) || item.address.toLowerCase().includes(q),
    );
  }, [userPos, query]);

  // Distancia (km) por id de centro, para pintarla en cada tarjeta/ficha.
  const kmById = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of ranked) if (r.km != null) m.set(r.item.id, r.km);
    return m;
  }, [ranked]);

  const nearestId = userPos ? nearest(userPos, approvedCenters)?.item.id ?? null : null;
  const featuredId = selectedId ?? nearestId ?? ranked[0]?.item.id ?? null;
  const featured = ranked.find((r) => r.item.id === featuredId) ?? ranked[0];
  const isNearest = featured?.item.id === nearestId;

  // Lazy loading: el resto de centros se carga por tandas al llegar al final.
  const rest = useMemo(
    () => ranked.filter((r) => r.item.id !== featuredId),
    [ranked, featuredId],
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const visibleRest = rest.slice(0, visibleCount);
  const hasMore = visibleCount < rest.length;

  // Reinicia la tanda cuando cambia el filtro/orden (búsqueda o ubicación).
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, userPos]);

  // Observa el centinela del final para pedir la siguiente tanda.
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisibleCount((c) => c + PAGE_SIZE);
      },
      { rootMargin: '160px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, visibleRest.length]);

  const publicTotals = useMemo(
    () => categoryTotals(donations, donationItems, categories).filter((t) => t.quantity > 0),
    [donations, donationItems],
  );

  function locateMe() {
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización.');
      return setGeoState('denied');
    }
    // La API de geolocalización solo funciona en contexto seguro (https o localhost).
    if (!window.isSecureContext) {
      setGeoError(
        'La ubicación requiere una conexión segura (https). Abre el sitio con https o desde localhost.',
      );
      return setGeoState('denied');
    }
    setGeoState('loading');
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(p);
        setGeoState('granted');
        const near = nearest(p, approvedCenters);
        if (near) {
          setSelectedId(near.item.id);
          setFlyTo({ lat: near.item.lat, lng: near.item.lng });
        }
        // Header dinámico: resuelve la zona detectada (OSM); si falla, mantiene la zona
        // del centro más cercano como pista útil para el visitante.
        reverseGeocode(p).then((label) => {
          if (label) setLocationLabel(label);
          else if (near) setLocationLabel(near.item.address.split(',').slice(-2).join(',').trim());
        });
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado. Actívalo en los ajustes del navegador.'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'No se pudo determinar tu ubicación (GPS no disponible).'
              : err.code === err.TIMEOUT
                ? 'Se agotó el tiempo para obtener tu ubicación. Intenta de nuevo.'
                : 'No pudimos obtener tu ubicación.';
        setGeoError(msg);
        setGeoState('denied');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  function selectCenter(center: Center) {
    setSelectedId(center.id);
    setFlyTo({ lat: center.lat, lng: center.lng });
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-line-soft bg-surface/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-rojo text-white">
              <MapPin className="h-5 w-5" aria-hidden />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-h3 font-black tracking-snug text-ink">Unidos</span>
              <span className="flex items-center gap-0.5 font-body text-2xs text-muted">
                <MapPin className="h-3 w-3 shrink-0 text-rojo" aria-hidden />
                <span className="truncate">{locationLabel}</span>
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label="Cambiar tema"
              leftIcon={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            >
              <span className="hidden sm:inline">{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
            </Button>
            <Link
              to="/admin/login"
              className="inline-flex h-control-sm items-center justify-center gap-2 whitespace-nowrap rounded-pill bg-rojo px-4 font-display text-2xs font-black tracking-snug text-white transition hover:brightness-95 active:brightness-90"
            >
              <Building2 className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">¿Eres un centro?</span>
              <span className="sm:hidden">Centro</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Título + buscador */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-6">
        <p className="font-body text-2xs font-bold uppercase tracking-eyebrow text-azul">
          Cerca, entre todos
        </p>
        <h1 className="mt-1 font-display text-h1 font-black tracking-tightest text-ink">
          Centros cerca de ti
        </h1>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            label="Buscar centro o zona"
            hideLabel
            placeholder="Buscar centro o zona…"
            leadingIcon={<Search className="h-4 w-4" aria-hidden />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:flex-1"
          />
          <Button
            variant="secondary"
            size="lg"
            onClick={locateMe}
            loading={geoState === 'loading'}
            leftIcon={geoState !== 'loading' ? <Navigation className="h-4 w-4" /> : undefined}
          >
            {userPos ? 'Actualizar ubicación' : 'Mi ubicación'}
          </Button>
        </div>
        {geoState === 'denied' && (
          <p className="mt-2 font-body text-xs text-danger-ink">
            {geoError ?? 'No pudimos obtener tu ubicación.'} Puedes explorar la lista y el mapa
            libremente.
          </p>
        )}
      </section>

      {/* Lista (dominante) + mapa (apoyo) */}
      <section className="mx-auto mt-5 grid w-full max-w-6xl flex-1 gap-4 px-4 lg:grid-cols-[1.25fr_1fr]">
        {/* Lista */}
        <div className="scrollbar-thin order-2 flex flex-col gap-3 lg:order-1 lg:sticky lg:top-20 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-1">
          {featured ? (
            <>
              {/* Más cercano / seleccionado: resaltado con barra tricolor */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-body text-2xs font-bold uppercase tracking-eyebrow text-subtle">
                    {isNearest ? 'Más cercano' : 'Seleccionado'}
                    {featured.km != null && ` · ${formatDistance(featured.km)}`}
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl">
                  <Tricolor className="rounded-none" />
                  <CenterCard
                    center={featured.item}
                    urgentSupplies={urgentSuppliesByCenter[featured.item.id]}
                    distanceKm={featured.km}
                    onDetails={() => setDetailCenter(featured.item)}
                    highlighted
                    className="rounded-t-none"
                  />
                </div>
              </div>

              {/* Resto de centros (lazy loading por tandas) */}
              <div className="flex flex-col gap-2">
                {visibleRest.map(({ item, km }) => (
                  <CenterCard
                    key={item.id}
                    center={item}
                    urgentSupplies={urgentSuppliesByCenter[item.id]}
                    distanceKm={km}
                    compact
                    onSelect={() => selectCenter(item)}
                    onDetails={() => setDetailCenter(item)}
                  />
                ))}
              </div>

              {/* Centinela: al entrar en vista carga la siguiente tanda. */}
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-3">
                  <Spinner size="sm" label="Cargando más centros…" />
                </div>
              )}
            </>
          ) : (
            <Card>
              <EmptyState
                icon={<Search className="h-6 w-6" />}
                title="Sin resultados"
                description="No encontramos centros para tu búsqueda."
              />
            </Card>
          )}
        </div>

        {/* Mapa de apoyo */}
        <div className="order-1 lg:order-2">
          <div className="h-52 overflow-hidden rounded-xl border border-line-soft shadow-card lg:sticky lg:top-20 lg:h-[70vh]">
            <CenterMap
              centers={approvedCenters}
              userPosition={userPos}
              selectedId={featuredId}
              flyTo={flyTo}
              onSelect={selectCenter}
            />
          </div>
        </div>
      </section>

      {/* Gráfico general de la red (§1.C) */}
      <section className="mx-auto mt-10 w-full max-w-6xl px-4 pb-16">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-azul" aria-hidden />
            <h2 className="font-display text-h3 font-black tracking-snug text-ink">
              Qué se está donando en la red
            </h2>
          </div>
          <p className="mb-5 font-body text-sm text-body">
            Proporción por categoría en todos los centros. Solo porcentajes — sin marcas
            ni cantidades exactas.
          </p>
          {publicTotals.length > 0 ? (
            <div className="flex flex-col gap-4">
              {publicTotals.map((t, i) => (
                <CategoryBar
                  key={t.category.id}
                  label={t.category.name}
                  percentage={t.percentage}
                  color={BAR_COLORS[i % BAR_COLORS.length]}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="Aún no hay datos" description="Todavía no se han registrado donaciones." />
          )}
        </Card>

        <div className="mt-6 flex items-center justify-center">
          <Badge tone="neutral">Proyecto sin fines de lucro · Ayuda a las víctimas del terremoto 2026</Badge>
        </div>
      </section>

      {/* Ficha ampliada del centro: contacto, redes y verificación */}
      <CenterDetailModal
        center={detailCenter}
        open={detailCenter !== null}
        onClose={() => setDetailCenter(null)}
        distanceKm={detailCenter ? kmById.get(detailCenter.id) ?? null : null}
        urgentSupplies={detailCenter ? urgentSuppliesByCenter[detailCenter.id] : undefined}
      />
    </div>
  );
}
