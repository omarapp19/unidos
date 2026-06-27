import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation, MapPin, BarChart3, Search, Sun, Moon, Building2, Activity, Stethoscope, TestTube, Pill, HeartPulse, Apple, Droplet, GlassWater, Shirt, Wrench, CheckCircle, XCircle, Plus, Menu, X, Users, Link2, ChevronDown, ChevronRight } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { nearest, sortByDistance, reverseGeocode, type LatLng, DEFAULT_LATLNG } from '@/lib/geo';
import { categoryTotals } from '@/lib/stats';
import { useQuery } from '@/lib/hooks/useQuery';
import { getApprovedCenters } from '@/lib/api/centers';
import { getCategories } from '@/lib/api/categories';
import { getNetworkDonationItems } from '@/lib/api/donations';
import { getNeededSupplies } from '@/lib/api/supplies';
import { getHelpCategories } from '@/lib/api/helpResources';
import type { Center } from '@/types';
import { cn } from '@/lib/utils';
import { Button, Card, Badge, Input, EmptyState, Spinner, QueryBoundary } from '@/components/ui';
import {
  CenterCard,
  CenterDetailModal,
  CategoryBar,
  type CategoryBarColor,
  SuggestCenterModal,
  OnboardingTour,
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

/** Cuántos centros se cargan por tanda al scrollear. */
const PAGE_SIZE = 6;

/** Zona mostrada en el header antes de detectar la ubicación del visitante. */
const DEFAULT_LOCATION = 'Chacao, Caracas';

type GeoState = 'idle' | 'loading' | 'granted' | 'denied';

function getSupplyIcon(name: string, sizeClass = 'h-4 w-4') {
  const n = name.toLowerCase();
  const cls = `${sizeClass} shrink-0`;
  
  // 1. Insumos Médicos y Equipos de Salud (Rojo)
  if (n.includes('med') || n.includes('salud') || n.includes('sanit') || n.includes('jering') || n.includes('gasa') || n.includes('venda')) {
    return <Stethoscope className={`${cls} text-rojo`} />;
  }
  
  // 2. Ampollas e Inyectables (Azul)
  if (n.includes('ampoll') || n.includes('inyect') || n.includes('suero')) {
    return <TestTube className={`${cls} text-azul`} />;
  }
  
  // 3. Tabletas y Medicamientos (Amarillo)
  if (n.includes('tablet') || n.includes('pastill') || n.includes('pild') || n.includes('medicament') || n.includes('capsul')) {
    return <Pill className={`${cls} text-amarillo`} />;
  }
  
  // 4. Agua e Hidratación (Azul)
  if (n.includes('agua') || n.includes('hidrat') || n.includes('bebida') || n.includes('botella') || n.includes('jugo') || n.includes('liquido')) {
    return <Droplet className={`${cls} text-azul`} />;
  }
  
  // 5. Alimentos y Nutrición (Rojo)
  if (n.includes('aliment') || n.includes('comid') || n.includes('leche') || n.includes('fruta') || n.includes('pan') || n.includes('arroz') || n.includes('pasta') || n.includes('enlat') || n.includes('atun') || n.includes('harina') || n.includes('grano')) {
    return <Apple className={`${cls} text-rojo`} />;
  }
  
  // 6. Ropa, Mantas y Cobijas (Verde)
  if (n.includes('ropa') || n.includes('vest') || n.includes('cobija') || n.includes('sabana') || n.includes('abrigo') || n.includes('sueter') || n.includes('franela') || n.includes('zapato') || n.includes('media') || n.includes('manta') || n.includes('colchon')) {
    return <Shirt className={`${cls} text-success`} />;
  }
  
  // 7. Herramientas, Higiene y Otros (Amarillo / Warning)
  if (n.includes('herramient') || n.includes('linterna') || n.includes('bateria') || n.includes('pila') || n.includes('pala') || n.includes('soga') || n.includes('cuerda') || n.includes('clavo') || n.includes('higiene') || n.includes('aseo') || n.includes('jabon') || n.includes('crema') || n.includes('pañal') || n.includes('toalla')) {
    return <Wrench className={`${cls} text-warning-ink`} />;
  }
  
  // Por defecto (Verde)
  return <HeartPulse className={`${cls} text-success`} />;
}

interface SimulatedDonation {
  id: string;
  text: string;
  categoryName: string;
  categoryTheme: 'azul' | 'rojo' | 'amarillo' | 'success' | 'purple' | 'orange';
  iconName: 'apple' | 'heart' | 'droplet' | 'water' | 'shirt' | 'wrench';
  timestamp: string;
}

const DONATION_TEMPLATES = [
  { text: 'caja de agua', categoryName: 'Agua e Hidratación', theme: 'success', icon: 'water', range: [1, 4] },
  { text: 'botellas de agua', categoryName: 'Agua e Hidratación', theme: 'success', icon: 'water', range: [2, 12] },
  { text: 'medicamentos en tabletas', categoryName: 'Medicinas e Insumos', theme: 'success', icon: 'water', range: [3, 8] },
  { text: 'latas de atún', categoryName: 'Alimentos No Perecederos', theme: 'azul', icon: 'apple', range: [3, 10] },
  { text: 'paquetes de pasta', categoryName: 'Alimentos No Perecederos', theme: 'azul', icon: 'apple', range: [2, 6] },
  { text: 'kilos de arroz', categoryName: 'Alimentos No Perecederos', theme: 'azul', icon: 'apple', range: [1, 5] },
  { text: 'Ampollas', categoryName: 'Medicina s e Insumos', theme: 'azul', icon: 'apple', range: [1, 3] },
  { text: 'insumos medicos', categoryName: 'Medicinas e Insumos', theme: 'rojo', icon: 'heart', range: [1, 5] },
  { text: 'vendas y gasas', categoryName: 'Medicinas e Insumos', theme: 'rojo', icon: 'heart', range: [4, 15] },
  { text: 'frascos de alcohol', categoryName: 'Medicinas e Insumos', theme: 'rojo', icon: 'heart', range: [1, 4] },
  { text: 'prendas de ropa', categoryName: 'Ropa, Calzado y Cobijo', theme: 'purple', icon: 'shirt', range: [2, 10] },
  { text: 'cobijas y sabanas', categoryName: 'Ropa, Calzado y Cobijo', theme: 'purple', icon: 'shirt', range: [1, 4] },
  { text: 'pares de zapatos', categoryName: 'Ropa, Calzado y Cobijo', theme: 'purple', icon: 'shirt', range: [1, 3] },
  { text: 'Guantes de latex', categoryName: 'Medicinas e Insumos', theme: 'amarillo', icon: 'droplet', range: [3, 8] },
  { text: 'cremas dentales', categoryName: 'Higiene Personal', theme: 'amarillo', icon: 'droplet', range: [2, 6] },
  { text: 'paquetes de pañales', categoryName: 'Higiene Personal', theme: 'amarillo', icon: 'droplet', range: [1, 3] },
  { text: 'linternas LED', categoryName: 'Herramientas y Logística', theme: 'orange', icon: 'wrench', range: [1, 3] },
  { text: 'Herramientas', categoryName: 'Herramientas y Logística', theme: 'orange', icon: 'wrench', range: [2, 6] },
  { text: 'guantes de trabajo', categoryName: 'Herramientas y Logística', theme: 'orange', icon: 'wrench', range: [1, 4] },
];

function getSimulatedIcon(iconName: string, className: string) {
  switch (iconName) {
    case 'apple': return <Apple className={className} />;
    case 'heart': return <HeartPulse className={className} />;
    case 'droplet': return <Droplet className={className} />;
    case 'water': return <GlassWater className={className} />;
    case 'shirt': return <Shirt className={className} />;
    case 'wrench': return <Wrench className={className} />;
    default: return <Apple className={className} />;
  }
}

const THEME_STYLES = {
  azul: { bg: 'bg-azul/10', text: 'text-azul-ink', border: 'border-azul/20' },
  rojo: { bg: 'bg-rojo/10', text: 'text-rojo-ink', border: 'border-rojo/20' },
  amarillo: { bg: 'bg-amarillo/10', text: 'text-amarillo-ink', border: 'border-amarillo/20' },
  success: { bg: 'bg-success/10', text: 'text-success-ink', border: 'border-success/20' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/20' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/20' },
};

function DonationSimulator() {
  const [donations, setDonations] = useState<SimulatedDonation[]>([]);

  useEffect(() => {
    // Generar las primeras 3 donaciones iniciales
    const initialList: SimulatedDonation[] = [];
    for (let i = 0; i < 3; i++) {
      const template = DONATION_TEMPLATES[Math.floor(Math.random() * DONATION_TEMPLATES.length)];
      if (!template) continue;
      const [min, max] = template.range;
      if (min === undefined || max === undefined) continue;
      const quantity = Math.floor(Math.random() * (max - min + 1)) + min;
      initialList.push({
        id: `initial-${i}-${Math.random()}`,
        text: `+${quantity} ${template.text}`,
        categoryName: template.categoryName,
        categoryTheme: template.theme as any,
        iconName: template.icon as any,
        timestamp: 'hace unos momentos',
      });
    }
    setDonations(initialList);

    const interval = setInterval(() => {
      const template = DONATION_TEMPLATES[Math.floor(Math.random() * DONATION_TEMPLATES.length)];
      if (!template) return;
      const [min, max] = template.range;
      if (min === undefined || max === undefined) return;
      const quantity = Math.floor(Math.random() * (max - min + 1)) + min;
      const newDonation: SimulatedDonation = {
        id: `sim-${Date.now()}-${Math.random()}`,
        text: `+${quantity} ${template.text}`,
        categoryName: template.categoryName,
        categoryTheme: template.theme as any,
        iconName: template.icon as any,
        timestamp: 'hace unos segundos',
      };

      setDonations((prev) => [newDonation, ...prev.slice(0, 2)]);
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full rounded-xl border border-line-soft bg-surface-2/30 p-4">
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-feed-item {
          animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="flex items-center justify-between border-b border-line-soft pb-2.5 mb-3">
        <div className="flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-rojo animate-pulse" />
          <span className="font-display text-2xs font-black uppercase tracking-wider text-ink">
            Actividad Reciente (En Vivo)
          </span>
        </div>

        <span className="inline-flex items-center gap-1 rounded-pill bg-success-bg px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-success-ink border border-success/15 select-none">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
          </span>
          En Vivo
        </span>
      </div>

      <div className="flex flex-col gap-2 min-h-[220px] justify-start">
        {donations.map((item, idx) => {
          const style = THEME_STYLES[item.categoryTheme];
          return (
            <div
              key={item.id}
              className={`animate-feed-item flex items-center justify-between p-3 rounded-lg border ${style.border} bg-surface transition-all duration-300 ${idx === 0 ? 'ring-1 ring-azul/10 shadow-xs' : 'opacity-60 scale-95 origin-top'
                }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${style.bg} ${style.text} shrink-0`}>
                  {getSimulatedIcon(item.iconName, 'h-4.5 w-4.5')}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-xs font-black tracking-tight text-ink">
                    <span className={`${style.text} font-black mr-1`}>
                      {item.text.split(' ')[0]}
                    </span>
                    {item.text.substring(item.text.indexOf(' ') + 1)}
                  </p>
                  <p className="font-body text-[10px] text-muted truncate">
                    {item.categoryName}
                  </p>
                </div>
              </div>

              <span className="font-body text-[9px] text-subtle shrink-0 ml-2 select-none">
                {idx === 0 ? 'hace un instante' : item.timestamp}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PublicHome() {
  const { theme, toggleTheme } = useTheme();
  // Datos reales (Supabase). Lectura pública vía RLS: centros aprobados,
  // catálogo de categorías e ítems de toda la red para el gráfico.
  const centersQuery = useQuery(getApprovedCenters, []);
  const categoriesQuery = useQuery(getCategories, []);
  const itemsQuery = useQuery(getNetworkDonationItems, []);
  const suppliesQuery = useQuery(getNeededSupplies, []);
  const helpCatsQuery = useQuery(getHelpCategories, []);
  const approvedCenters = centersQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const donationItems = itemsQuery.data ?? [];
  const neededSupplies = suppliesQuery.data ?? [];
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [geoState, setGeoState] = useState<GeoState>('idle');
  const [geoError, setGeoError] = useState<string | null>(null);
  // Zona detectada (reverse-geocoding) que se muestra en el header. Por defecto, la
  // ciudad base del proyecto hasta que el usuario comparta su ubicación.
  const [locationLabel, setLocationLabel] = useState<string>(DEFAULT_LOCATION);
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<LatLng | null>(null);
  const [query, setQuery] = useState('');
  // Centro abierto en la ficha ampliada (contacto + redes). `null` = modal cerrado.
  const [detailCenter, setDetailCenter] = useState<Center | null>(null);
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'centers' | 'info'>('centers');

  // Control para inicializar el centro más cercano una sola vez cuando
  // coincidan la disponibilidad de la ubicación y de los centros cargados.
  const hasInitializedNearestRef = useRef(false);

  // Sincronizar el centro más cercano una vez que se tiene la ubicación y los centros cargados.
  useEffect(() => {
    if (userPos && approvedCenters.length > 0 && !hasInitializedNearestRef.current) {
      hasInitializedNearestRef.current = true;
      const near = nearest(userPos, approvedCenters);
      if (near) {
        setMapSelectedId(near.item.id);
        setFlyTo({ lat: near.item.lat, lng: near.item.lng });
        if (locationLabel === DEFAULT_LOCATION) {
          reverseGeocode(userPos).then((label) => {
            if (label) setLocationLabel(label);
            else setLocationLabel(near.item.address.split(',').slice(-2).join(',').trim());
          });
        }
      }
    }
  }, [approvedCenters, userPos, locationLabel]);

  // Pedir ubicación automáticamente al cargar la web
  useEffect(() => {
    locateMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [userPos, query, approvedCenters]);

  // Distancia (km) por id de centro, para pintarla en cada tarjeta/ficha.
  const kmById = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of ranked) if (r.km != null) m.set(r.item.id, r.km);
    return m;
  }, [ranked]);

  // Lazy loading: centros se cargan por tandas al llegar al final.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const visibleCenters = ranked.slice(0, visibleCount);
  const hasMore = visibleCount < ranked.length;

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
  }, [hasMore, visibleCenters.length]);

  // Gráfico de la red: solo ítems (sin tocar donaciones → nombres privados).
  const publicTotals = useMemo(
    () => categoryTotals([], donationItems, categories).filter((t) => t.quantity > 0),
    [donationItems, categories],
  );

  async function fallbackToIpLocation() {
    try {
      const res = await fetch('https://freeipapi.com/api/json');
      if (!res.ok) throw new Error('API response not OK');
      const data = await res.json();
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        const p = { lat: data.latitude, lng: data.longitude };
        setUserPos(p);

        const near = nearest(p, approvedCenters);
        if (near) {
          setMapSelectedId(near.item.id);
          setFlyTo({ lat: near.item.lat, lng: near.item.lng });
        }

        if (data.cityName) {
          const label = data.regionName ? `${data.cityName}, ${data.regionName}` : data.cityName;
          setLocationLabel(label);
        } else {
          reverseGeocode(p).then((label) => {
            if (label) setLocationLabel(label);
            else if (near) setLocationLabel(near.item.address.split(',').slice(-2).join(',').trim());
          });
        }
      }
    } catch (e) {
      console.error('Error fallback to IP geolocation:', e);
      setFlyTo(DEFAULT_LATLNG);
    }
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización.');
      setGeoState('denied');
      fallbackToIpLocation();
      return;
    }
    // La API de geolocalización solo funciona en contexto seguro (https o localhost).
    if (!window.isSecureContext) {
      setGeoError(
        'La ubicación requiere una conexión segura (https). Abre el sitio con https o desde localhost.',
      );
      setGeoState('denied');
      fallbackToIpLocation();
      return;
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
          setMapSelectedId(near.item.id);
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
        fallbackToIpLocation();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  function selectCenter(center: Center) {
    setMapSelectedId(center.id);
    setFlyTo({ lat: center.lat, lng: center.lng });
  }

  function handleMapSelect(center: Center) {
    selectCenter(center);
    setDetailCenter(center);
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-line-soft bg-surface/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="logo-badge flex h-9 w-9 items-center justify-center rounded-md shrink-0">
              <img
                src="/logo-mark.png"
                alt="Centros de Acopio Venezuela"
                className="h-full w-full object-contain"
                width={36}
                height={36}
              />
            </span>
            <span className="flex flex-col leading-none min-w-0">
              <span className="font-display text-h3 font-black tracking-snug text-ink">Unidos</span>
              <span className="hidden min-[360px]:flex items-center gap-0.5 font-body text-2xs text-muted min-w-0">
                <MapPin className="h-3 w-3 shrink-0 text-rojo" aria-hidden />
                <span className="truncate max-w-[100px] sm:max-w-none">{locationLabel}</span>
              </span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label="Cambiar tema"
              leftIcon={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            >
              <span className="hidden md:inline">{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSuggestModalOpen(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Agregar nuevo centro
            </Button>
            <Link
              to="/personas-desaparecidas"
              className="inline-flex h-control-sm items-center justify-center gap-2 whitespace-nowrap rounded-pill bg-amber-600 px-4 font-display text-2xs font-black tracking-snug text-white transition hover:brightness-95 active:brightness-90"
            >
              <Users className="h-4 w-4" aria-hidden />
              ¿Conoces personas desaparecidas?
            </Link>
            {/* Portal de Ayuda — dropdown desktop */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setPortalOpen((v) => !v)}
                className="inline-flex h-control-sm items-center justify-center gap-1.5 whitespace-nowrap rounded-pill border border-line-soft bg-surface-2 px-3 font-display text-2xs font-black tracking-snug text-ink transition hover:border-azul/50 hover:text-azul"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden />
                Portal de Ayuda
                <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', portalOpen && 'rotate-180')} aria-hidden />
              </button>

              {portalOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPortalOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-2xl border border-line-soft bg-surface shadow-lg animate-[selectIn_150ms_ease-out]">
                    {helpCatsQuery.loading && (
                      <div className="flex justify-center p-4">
                        <Spinner size="sm" label="Cargando…" />
                      </div>
                    )}
                    <div className="p-1.5">
                      {helpCatsQuery.data?.map((cat) => (
                        <Link
                          key={cat.id}
                          to={`/ayuda/${cat.id}`}
                          onClick={() => setPortalOpen(false)}
                          className="flex items-center justify-between rounded-xl px-3 py-2.5 font-display text-sm font-bold text-ink transition hover:bg-surface-2 hover:text-azul"
                        >
                          {cat.name}
                          <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Link
              to="/admin/login"
              className="inline-flex h-control-sm items-center justify-center gap-2 whitespace-nowrap rounded-pill bg-rojo px-3 sm:px-4 font-display text-2xs font-black tracking-snug text-white transition hover:brightness-95 active:brightness-90"
            >
              <Building2 className="h-4 w-4" aria-hidden />
              ¿Eres un centro?
            </Link>
          </div>

          {/* Mobile Navigation Trigger */}
          <div className="flex sm:hidden items-center gap-1.5 shrink-0">
            {/* Portal de Ayuda — visible siempre en mobile */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setPortalOpen((v) => !v)}
                className="inline-flex h-9 items-center justify-center gap-1 whitespace-nowrap rounded-pill border border-line-soft bg-surface-2 px-3 font-display text-2xs font-black tracking-snug text-ink transition hover:border-azul/50 hover:text-azul"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden min-[400px]:inline">Portal de Ayuda</span>
                <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', portalOpen && 'rotate-180')} aria-hidden />
              </button>
              {portalOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPortalOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-2xl border border-line-soft bg-surface shadow-lg animate-[selectIn_150ms_ease-out]">
                    <div className="p-1.5">
                      {helpCatsQuery.data?.map((cat) => (
                        <Link
                          key={cat.id}
                          to={`/ayuda/${cat.id}`}
                          onClick={() => setPortalOpen(false)}
                          className="flex items-center justify-between rounded-xl px-3 py-2.5 font-display text-sm font-bold text-ink transition hover:bg-surface-2 hover:text-azul"
                        >
                          {cat.name}
                          <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label="Cambiar tema"
              leftIcon={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              className="px-2.5"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
              leftIcon={mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              className="px-2.5"
            />
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-line-soft bg-surface sm:hidden animate-[selectIn_150ms_ease-out]">
            <div className="flex flex-col gap-2 p-4">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSuggestModalOpen(true);
                }}
                leftIcon={<Plus className="h-4 w-4" />}
                fullWidth
              >
                Agregar nuevo centro
              </Button>
              <Link
                to="/personas-desaparecidas"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-amber-600 px-5 font-display text-sm font-black tracking-snug text-white transition hover:brightness-95 active:brightness-90"
              >
                <Users className="h-4 w-4" aria-hidden />
                ¿Conoces personas desaparecidas?
              </Link>

              <Link
                to="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-rojo px-5 font-display text-sm font-black tracking-snug text-white transition hover:brightness-95 active:brightness-90"
              >
                <Building2 className="h-4 w-4" aria-hidden />
                ¿Eres un centro? (Área Administrativa)
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Título + buscador + Insumos */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-6 grid gap-6 lg:grid-cols-2 items-start">
        {/* Lado izquierdo: Título + buscador */}
        <div className="w-full">
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
        </div>

        {/* Lado derecho: Insumos críticos más necesitados (arriba del mapa en desktop) */}
        <div className="w-full flex flex-col items-center lg:items-center">
          {neededSupplies.length > 0 && (
            <div className="flex flex-col gap-2.5 w-full items-center">
              <div className="flex items-center justify-between w-full max-w-[312px]">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-rojo animate-pulse" />
                  <span className="font-display text-[10px] font-black uppercase tracking-wider text-ink">
                    Insumos Críticos Requeridos
                  </span>
                </div>

                {/* Indicador En Vivo */}
                <span className="inline-flex items-center gap-1 rounded-pill bg-danger-bg px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-danger-ink border border-danger-bg/50 select-none">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-danger"></span>
                  </span>
                  En Vivo
                </span>
              </div>

              <div className="flex flex-wrap gap-3 justify-center">
                {neededSupplies.map((item) => (
                  <div
                    key={item.id}
                    className="relative flex flex-col items-center justify-center gap-1.5 w-24 h-24 rounded-2xl border border-line-soft bg-surface p-3 hover:scale-[1.04] hover:border-azul/45 hover:shadow-xs transition-all duration-200 select-none"
                  >
                    {/* Indicador verde de pulso en la esquina superior derecha */}
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-success animate-pulse" title="Requerido urgentemente" />

                    {/* Icono más grande con fondo circular */}
                    <div className="flex items-center justify-center p-2 rounded-full bg-surface-2 shrink-0">
                      {getSupplyIcon(item.name, 'h-5 w-5')}
                    </div>

                    {/* Texto del insumo centrado abajo */}
                    <span className="font-body text-[10px] font-bold leading-tight text-ink text-center truncate w-full px-0.5" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Selector de Pestañas (Solo Mobile/Tablet) */}
      <div className="sticky top-[61px] z-20 bg-bg/95 backdrop-blur border-b border-line-soft lg:hidden">
        <div className="mx-auto flex max-w-6xl px-4">
          <button
            onClick={() => setActiveMobileTab('centers')}
            className={cn(
              "flex-1 py-3 text-center font-display text-[11px] font-black uppercase tracking-wider transition-all duration-200 border-b-2",
              activeMobileTab === 'centers'
                ? "border-rojo text-rojo"
                : "border-transparent text-muted hover:text-ink"
            )}
          >
            Explorar Centros
          </button>
          <button
            onClick={() => setActiveMobileTab('info')}
            className={cn(
              "flex-1 py-3 text-center font-display text-[11px] font-black uppercase tracking-wider transition-all duration-200 border-b-2",
              activeMobileTab === 'info'
                ? "border-rojo text-rojo"
                : "border-transparent text-muted hover:text-ink"
            )}
          >
            Información y Guía
          </button>
        </div>
      </div>

      {/* Lista (dominante) + mapa (apoyo) */}
      <section className={cn(
        "mx-auto mt-5 flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 lg:grid lg:grid-cols-[1.25fr_1fr]",
        activeMobileTab !== 'centers' && "hidden lg:grid"
      )}>
        {/* Lista */}
        <div className="scrollbar-thin order-2 flex flex-col gap-3 lg:order-1 lg:sticky lg:top-20 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-1">
          <QueryBoundary
            loading={centersQuery.loading}
            error={centersQuery.error}
            onRetry={centersQuery.refetch}
            loadingLabel="Cargando centros…"
          >
            {visibleCenters.length > 0 ? (
              <>
                <div className="flex flex-col gap-2">
                  {visibleCenters.map(({ item, km }) => (
                    <CenterCard
                      key={item.id}
                      center={item}
                      distanceKm={km}
                      compact
                      onSelect={() => selectCenter(item)}
                      onDetails={() => setDetailCenter(item)}
                    />
                  ))}
                </div>

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
          </QueryBoundary>
        </div>

        {/* Mapa de apoyo — sticky en mobile y desktop */}
        <div className="order-1 lg:order-2 sticky top-[105px] z-10 bg-bg lg:static lg:z-0">
          <div className="h-52 overflow-hidden rounded-xl border border-line-soft shadow-card lg:sticky lg:top-20 lg:h-[70vh]">
            <CenterMap
              centers={approvedCenters}
              userPosition={userPos}
              selectedId={mapSelectedId}
              flyTo={flyTo}
              onSelect={handleMapSelect}
            />
          </div>
        </div>
      </section>

      {/* Gráfico general de la red (§1.C) */}
      <section className={cn(
        "mx-auto mt-10 w-full max-w-6xl px-4 pb-6",
        activeMobileTab !== 'info' && "hidden lg:block"
      )}>
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-azul" aria-hidden />
            <h2 className="font-display text-h3 font-black tracking-snug text-ink">
              Qué se está donando en la red
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2 items-start">
            {/* Lado izquierdo: Gráficos de Categoría */}
            <div>
              <p className="mb-5 font-body text-sm text-body">
                Proporción por categoría en todos los centros. Solo porcentajes — sin marcas
                ni cantidades exactas.
              </p>
              <QueryBoundary
                loading={itemsQuery.loading || categoriesQuery.loading}
                error={itemsQuery.error ?? categoriesQuery.error}
                onRetry={() => {
                  itemsQuery.refetch();
                  categoriesQuery.refetch();
                }}
                loadingLabel="Cargando estadísticas…"
              >
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
              </QueryBoundary>
            </div>

            {/* Lado derecho: Simulador de Donaciones en Vivo */}
            <div className="w-full">
              <DonationSimulator />
            </div>
          </div>
        </Card>
      </section>

      {/* Guía Informativa de Insumos Permitidos */}
      <section className={cn(
        "mx-auto w-full max-w-6xl px-4 pb-16",
        activeMobileTab !== 'info' && "hidden lg:block"
      )}>
        <Card className="p-6 border border-line-soft shadow-card">
          <div className="mb-6 border-b border-line-soft pb-4">
            <h2 className="font-display text-h3 font-black tracking-snug text-ink flex items-center gap-2">
              <Building2 className="h-5 w-5 text-azul" />
              Guía de Insumos: ¿Qué se puede donar?
            </h2>
            <p className="font-body text-sm text-body mt-1">
              Información oficial sobre los suministros necesarios para los afectados y las condiciones requeridas para cada tipo de donación.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 1. Alimentos */}
            <div className="group relative flex flex-col rounded-xl border border-line-soft bg-surface p-5 hover:scale-[1.02] hover:-translate-y-1 hover:border-azul/50 hover:shadow-[0_16px_36px_rgba(31,111,214,0.12)] transition-all duration-300">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-azul/10 text-azul group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shrink-0">
                  <Apple className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-black tracking-tight text-ink group-hover:text-azul transition-colors">
                    Alimentos No Perecederos
                  </h3>
                  <span className="text-[10px] font-bold text-azul uppercase tracking-wider font-body">Nutrición y Energía</span>
                </div>
              </div>

              <p className="mt-3 font-body text-xs text-muted leading-relaxed">
                Productos con fecha de vencimiento lejana que no requieran refrigeración.
              </p>

              <div className="mt-4 flex-1 flex flex-col gap-3">
                {/* Aceptado (SÍ) */}
                <div className="rounded-lg bg-success-bg p-3 border border-success/15 flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 font-body text-[10px] font-extrabold uppercase tracking-wider text-success-ink select-none">
                    <CheckCircle className="h-3.5 w-3.5 text-success" />
                    ¿Qué traer?
                  </span>
                  <ul className="font-body text-xs text-body leading-relaxed space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Enlatados, arroz, pasta y granos</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Aceite y harina de maíz</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Fórmulas lácteas infantiles</span>
                    </li>
                  </ul>
                </div>

                {/* Rechazado (NO) */}
                <div className="rounded-lg bg-danger-bg p-3 border border-danger/15 flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 font-body text-[10px] font-extrabold uppercase tracking-wider text-danger-ink select-none">
                    <XCircle className="h-3.5 w-3.5 text-danger" />
                    ¿Qué evitar?
                  </span>
                  <ul className="font-body text-xs text-body leading-relaxed space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-danger font-bold shrink-0">✗</span>
                      <span>Alimentos preparados o perecederos</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-danger font-bold shrink-0">✗</span>
                      <span>Productos vencidos o en mal estado</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-danger font-bold shrink-0">✗</span>
                      <span>Envases de vidrio dañados</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 2. Salud y Medicinas */}
            <div className="group relative flex flex-col rounded-xl border border-line-soft bg-surface p-5 hover:scale-[1.02] hover:-translate-y-1 hover:border-rojo/50 hover:shadow-[0_16px_36px_rgba(226,59,46,0.12)] transition-all duration-300">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rojo/10 text-rojo group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shrink-0">
                  <HeartPulse className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-black tracking-tight text-ink group-hover:text-rojo transition-colors">
                    Medicinas e Insumos
                  </h3>
                  <span className="text-[10px] font-bold text-rojo uppercase tracking-wider font-body">Primeros Auxilios</span>
                </div>
              </div>

              <p className="mt-3 font-body text-xs text-muted leading-relaxed">
                Medicamentos vigentes y material de curación para primeros auxilios.
              </p>

              <div className="mt-4 flex-1 flex flex-col gap-3">
                {/* Aceptado (SÍ) */}
                <div className="rounded-lg bg-success-bg p-3 border border-success/15 flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 font-body text-[10px] font-extrabold uppercase tracking-wider text-success-ink select-none">
                    <CheckCircle className="h-3.5 w-3.5 text-success" />
                    ¿Qué traer?
                  </span>
                  <ul className="font-body text-xs text-body leading-relaxed space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Analgésicos y antibióticos</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Gasas, vendas y adhesivos</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Alcohol y soluciones antisépticas</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Jeringas y material de curación</span>
                    </li>
                  </ul>
                </div>

                {/* Rechazado (NO) */}
                <div className="rounded-lg bg-danger-bg p-3 border border-danger/15 flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 font-body text-[10px] font-extrabold uppercase tracking-wider text-danger-ink select-none">
                    <XCircle className="h-3.5 w-3.5 text-danger" />
                    ¿Qué evitar?
                  </span>
                  <ul className="font-body text-xs text-body leading-relaxed space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-danger font-bold shrink-0">✗</span>
                      <span>Medicamentos vencidos o abiertos</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-danger font-bold shrink-0">✗</span>
                      <span>Jarabes o suspensiones empezados</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-danger font-bold shrink-0">✗</span>
                      <span>Psicofármacos o de control especial</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 3. Higiene Personal */}
            <div className="group relative flex flex-col rounded-xl border border-line-soft bg-surface p-5 hover:scale-[1.02] hover:-translate-y-1 hover:border-amarillo/50 hover:shadow-[0_16px_36px_rgba(244,192,33,0.12)] transition-all duration-300">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amarillo/10 text-amarillo-ink group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shrink-0">
                  <Droplet className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-black tracking-tight text-ink group-hover:text-amarillo-ink transition-colors">
                    Higiene Personal
                  </h3>
                  <span className="text-[10px] font-bold text-amarillo-ink uppercase tracking-wider font-body">Cuidado y Aseo</span>
                </div>
              </div>

              <p className="mt-3 font-body text-xs text-muted leading-relaxed">
                Artículos esenciales para el aseo diario de niños, adultos y familias.
              </p>

              <div className="mt-4 flex-1 flex flex-col gap-3">
                {/* Aceptado (SÍ) */}
                <div className="rounded-lg bg-success-bg p-3 border border-success/15 flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 font-body text-[10px] font-extrabold uppercase tracking-wider text-success-ink select-none">
                    <CheckCircle className="h-3.5 w-3.5 text-success" />
                    ¿Qué traer?
                  </span>
                  <ul className="font-body text-xs text-body leading-relaxed space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Jabón de baño y champú</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Crema dental, cepillos y aseo personal</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Pañales (para bebés y adultos)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Toallas sanitarias y toallitas húmedas</span>
                    </li>
                  </ul>
                </div>

                {/* Rechazado (NO) */}
                <div className="rounded-lg bg-danger-bg p-3 border border-danger/15 flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 font-body text-[10px] font-extrabold uppercase tracking-wider text-danger-ink select-none">
                    <XCircle className="h-3.5 w-3.5 text-danger" />
                    ¿Qué evitar?
                  </span>
                  <ul className="font-body text-xs text-body leading-relaxed space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-danger font-bold shrink-0">✗</span>
                      <span>Productos de higiene abiertos o usados</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-danger font-bold shrink-0">✗</span>
                      <span>Envases rotos, sucios o con fugas</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 4. Agua e Hidratación */}
            <div className="group relative flex flex-col rounded-xl border border-line-soft bg-surface p-5 hover:scale-[1.02] hover:-translate-y-1 hover:border-success/50 hover:shadow-[0_16px_36px_rgba(47,158,91,0.12)] transition-all duration-300">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shrink-0">
                  <GlassWater className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-black tracking-tight text-ink group-hover:text-success transition-colors">
                    Agua e Hidratación
                  </h3>
                  <span className="text-[10px] font-bold text-success-ink uppercase tracking-wider font-body">Recurso Vital</span>
                </div>
              </div>

              <p className="mt-3 font-body text-xs text-muted leading-relaxed">
                Vital para el consumo y preparación de alimentos básicos en zonas afectadas.
              </p>

              <div className="mt-4 flex-1 flex flex-col gap-3">
                {/* Aceptado (SÍ) */}
                <div className="rounded-lg bg-success-bg p-3 border border-success/15 flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 font-body text-[10px] font-extrabold uppercase tracking-wider text-success-ink select-none">
                    <CheckCircle className="h-3.5 w-3.5 text-success" />
                    ¿Qué traer?
                  </span>
                  <ul className="font-body text-xs text-body leading-relaxed space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Agua embotellada y sellada (original)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Suero oral (líquido o en polvo)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Bebidas hidratantes y electrolitos</span>
                    </li>
                  </ul>
                </div>

                {/* Rechazado (NO) */}
                <div className="rounded-lg bg-danger-bg p-3 border border-danger/15 flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 font-body text-[10px] font-extrabold uppercase tracking-wider text-danger-ink select-none">
                    <XCircle className="h-3.5 w-3.5 text-danger" />
                    ¿Qué evitar?
                  </span>
                  <ul className="font-body text-xs text-body leading-relaxed space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-danger font-bold shrink-0">✗</span>
                      <span>Agua envasada de procedencia casera</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-danger font-bold shrink-0">✗</span>
                      <span>Botellas o galones previamente abiertos</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 5. Ropa y Cobijo */}
            <div className="group relative flex flex-col rounded-xl border border-line-soft bg-surface p-5 hover:scale-[1.02] hover:-translate-y-1 hover:border-purple-500/50 hover:shadow-[0_16px_36px_rgba(168,85,247,0.12)] transition-all duration-300">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shrink-0">
                  <Shirt className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-black tracking-tight text-ink group-hover:text-purple-600 transition-colors">
                    Ropa, Calzado y Cobijo
                  </h3>
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider font-body">Protección y Abrigo</span>
                </div>
              </div>

              <p className="mt-3 font-body text-xs text-muted leading-relaxed">
                Prendas de vestir y artículos de abrigo para resguardar a las personas del clima.
              </p>

              <div className="mt-4 flex-1 flex flex-col gap-3">
                {/* Aceptado (SÍ) */}
                <div className="rounded-lg bg-success-bg p-3 border border-success/15 flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 font-body text-[10px] font-extrabold uppercase tracking-wider text-success-ink select-none">
                    <CheckCircle className="h-3.5 w-3.5 text-success" />
                    ¿Qué traer?
                  </span>
                  <ul className="font-body text-xs text-body leading-relaxed space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Cobijas, frazadas y sábanas limpias</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Ropa en buen estado (lavada y lista)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Zapatos cómodos / calzado deportivo</span>
                    </li>
                  </ul>
                </div>

                {/* Rechazado (NO) */}
                <div className="rounded-lg bg-danger-bg p-3 border border-danger/15 flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 font-body text-[10px] font-extrabold uppercase tracking-wider text-danger-ink select-none">
                    <XCircle className="h-3.5 w-3.5 text-danger" />
                    ¿Qué evitar?
                  </span>
                  <ul className="font-body text-xs text-body leading-relaxed space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-danger font-bold shrink-0">✗</span>
                      <span>Ropa rota, sucia, mojada o húmeda</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-danger font-bold shrink-0">✗</span>
                      <span>Zapatos de tacón alto o calzado roto</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-danger font-bold shrink-0">✗</span>
                      <span>Ropa interior usada</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 6. Herramientas y Logística */}
            <div className="group relative flex flex-col rounded-xl border border-line-soft bg-surface p-5 hover:scale-[1.02] hover:-translate-y-1 hover:border-orange-500/50 hover:shadow-[0_16px_36px_rgba(249,115,22,0.12)] transition-all duration-300">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shrink-0">
                  <Wrench className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-black tracking-tight text-ink group-hover:text-orange-600 transition-colors">
                    Herramientas y Logística
                  </h3>
                  <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider font-body">Soporte y Rescate</span>
                </div>
              </div>

              <p className="mt-3 font-body text-xs text-muted leading-relaxed">
                Artículos auxiliares para la remoción de escombros o iluminación de emergencia.
              </p>

              <div className="mt-4 flex-1 flex flex-col gap-3">
                {/* Aceptado (SÍ) */}
                <div className="rounded-lg bg-success-bg p-3 border border-success/15 flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 font-body text-[10px] font-extrabold uppercase tracking-wider text-success-ink select-none">
                    <CheckCircle className="h-3.5 w-3.5 text-success" />
                    ¿Qué traer?
                  </span>
                  <ul className="font-body text-xs text-body leading-relaxed space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Linternas con baterías y pilas</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Velas y fósforos (cerillas)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Cuerdas, palas y herramientas básicas</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span>Guantes de trabajo y tapabocas</span>
                    </li>
                  </ul>
                </div>

                {/* Rechazado (NO) */}
                <div className="rounded-lg bg-danger-bg p-3 border border-danger/15 flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 font-body text-[10px] font-extrabold uppercase tracking-wider text-danger-ink select-none">
                    <XCircle className="h-3.5 w-3.5 text-danger" />
                    ¿Qué evitar?
                  </span>
                  <ul className="font-body text-xs text-body leading-relaxed space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-danger font-bold shrink-0">✗</span>
                      <span>Combustibles en envases inseguros</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-danger font-bold shrink-0">✗</span>
                      <span>Artículos pirotécnicos o inflamables</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
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
      />

      <SuggestCenterModal
        open={suggestModalOpen}
        onClose={() => setSuggestModalOpen(false)}
      />

      <OnboardingTour />
    </div>
  );
}
