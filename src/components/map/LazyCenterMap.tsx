import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Spinner } from '@/components/ui';
import type { CenterMapProps } from './CenterMap';

/* ===========================================================================
   Carga perezosa del mapa. Leaflet + react-leaflet + su CSS pesan ~150 KB y no
   hacen falta para el LCP. Este wrapper:
     1. No descarga el chunk del mapa hasta que el contenedor entra en viewport
        (IntersectionObserver) o el navegador queda inactivo (requestIdleCallback).
     2. Muestra un placeholder con la misma altura para no provocar layout shift.
   La API es idéntica a `CenterMap`, así que es un reemplazo directo.
   ========================================================================== */

const CenterMap = lazy(() =>
  import('./CenterMap').then((m) => ({ default: m.CenterMap })),
);

function MapPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-line-soft/30">
      <Spinner size="sm" label="Cargando mapa…" />
    </div>
  );
}

export function LazyCenterMap(props: CenterMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;

    let idleId: number | undefined;
    const load = () => setShow(true);

    // Si ya es visible o el navegador no soporta IO, carga al quedar inactivo.
    const io =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((e) => e.isIntersecting)) {
                load();
                io?.disconnect();
              }
            },
            { rootMargin: '200px' },
          )
        : null;

    if (io) io.observe(el);

    // Red de seguridad: precarga en el primer hueco de inactividad.
    const ric: typeof requestIdleCallback | undefined =
      typeof requestIdleCallback === 'function' ? requestIdleCallback : undefined;
    if (ric) idleId = ric(load, { timeout: 2500 });
    else idleId = window.setTimeout(load, 1500);

    return () => {
      io?.disconnect();
      if (ric && idleId !== undefined) cancelIdleCallback(idleId);
      else if (idleId !== undefined) clearTimeout(idleId);
    };
  }, [show]);

  return (
    <div ref={ref} className="h-full w-full">
      {show ? (
        <Suspense fallback={<MapPlaceholder />}>
          <CenterMap {...props} />
        </Suspense>
      ) : (
        <MapPlaceholder />
      )}
    </div>
  );
}
