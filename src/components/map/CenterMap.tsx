import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Center, CenterStatus } from '@/types';
import type { LatLng } from '@/lib/geo';

/* ===========================================================================
   Mapa interactivo (PRD §1.A). react-leaflet sobre tiles de OpenStreetMap
   (libres, sin API key). Pines por estado del centro + pin del usuario.
   Los íconos se construyen con divIcon (HTML) para usar los colores de marca
   y evitar el problema de assets de los íconos por defecto de Leaflet bajo Vite.
   ========================================================================== */

const STATUS_COLOR: Record<CenterStatus, string> = {
  receiving: 'var(--color-success)',
  full: 'var(--color-warning)',
  closed: 'var(--color-danger)',
};

/** Pin en forma de gota con color por estado. `big` resalta el más cercano. */
function centerIcon(status: CenterStatus, big = false): L.DivIcon {
  const size = big ? 40 : 30;
  const color = STATUS_COLOR[status];
  const ring = big
    ? 'box-shadow:0 0 0 6px rgba(31,111,214,0.30);'
    : 'box-shadow:0 2px 6px rgba(0,0,0,0.3);';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:3px solid #fff;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);${ring}
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    tooltipAnchor: [0, -size],
  });
}

const userIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:18px;height:18px;background:var(--color-azul);
    border:3px solid #fff;border-radius:50%;
    box-shadow:0 0 0 6px rgba(31,111,214,0.25);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/** Recentra/zoom el mapa cuando cambia el centro objetivo (imperativo). */
function Recenter({ target, zoom }: { target: LatLng | null; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], zoom, { duration: 0.8 });
  }, [target, zoom, map]);
  return null;
}

export interface CenterMapProps {
  centers: Center[];
  /** Posición del usuario (si concedió permiso). */
  userPosition?: LatLng | null;
  /** Centro resaltado (el más cercano o el seleccionado). */
  selectedId?: string | null;
  /** Centro al que volar (al elegir en la lista o detectar el más cercano). */
  flyTo?: LatLng | null;
  onSelect?: (center: Center) => void;
  className?: string;
}

const CARACAS: [number, number] = [10.4806, -66.9036];

export function CenterMap({
  centers,
  userPosition,
  selectedId,
  flyTo,
  onSelect,
  className,
}: CenterMapProps) {
  // Memoizar íconos para no recrearlos en cada render.
  const icons = useMemo(() => {
    const cache = new Map<string, L.DivIcon>();
    for (const c of centers) {
      cache.set(c.id, centerIcon(c.status, c.id === selectedId));
    }
    return cache;
  }, [centers, selectedId]);

  return (
    <MapContainer
      center={CARACAS}
      zoom={12}
      scrollWheelZoom
      className={className}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Recenter target={flyTo ?? null} zoom={15} />

      {userPosition && (
        <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon}>
          <Tooltip direction="top">Tu ubicación</Tooltip>
        </Marker>
      )}

      {centers.map((center) => (
        <Marker
          key={center.id}
          position={[center.lat, center.lng]}
          icon={icons.get(center.id)!}
          eventHandlers={{ click: () => onSelect?.(center) }}
        >
          <Tooltip direction="top">{center.name}</Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
