import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';

/* ===========================================================================
   Campo de ubicación: mapa Leaflet (OSM) para situar el marcador del centro.
   - Click en el mapa => emite (lat, lng). El padre puede reverse-geocodificar.
   - Se centra en las coords actuales o, si no hay, en Caracas por defecto.
   Compartido por el registro de centro y el modal "Sugerir centro".
   ========================================================================== */

/** Centro por defecto del mapa (Maracaibo) cuando aún no hay coords. */
const MARACAIBO_CENTER: [number, number] = [10.6447, -71.6331];

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 30px; height: 30px;
    background: var(--color-rojo);
    border: 3px solid #fff; border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

function Picker({
  lat,
  lng,
  hasMarker,
  onChange,
}: {
  lat: number;
  lng: number;
  hasMarker: boolean;
  onChange: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    map.panTo([lat, lng]);
  }, [lat, lng, map]);

  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });

  if (!hasMarker) return null;
  return <Marker position={[lat, lng]} icon={pinIcon} />;
}

export interface LocationFieldProps {
  /** Coordenada seleccionada (null = aún sin elegir). */
  lat: number | null;
  lng: number | null;
  /** Se invoca al hacer click en el mapa con la nueva coordenada. */
  onChange: (lat: number, lng: number) => void;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

export function LocationField({
  lat,
  lng,
  onChange,
  label = 'Ubicación en el mapa',
  hint = 'Haz clic en el mapa para situar exactamente el marcador de ubicación.',
  error,
  required = false,
}: LocationFieldProps) {
  const [gpsCenter, setGpsCenter] = useState<[number, number] | null>(null);

  // Intentar obtener la ubicación del usuario mediante GPS si ya está aprobada
  useEffect(() => {
    try {
      if (typeof navigator !== 'undefined' && navigator.permissions && navigator.geolocation) {
        navigator.permissions
          .query({ name: 'geolocation' as PermissionName })
          .then((result) => {
            if (result.state === 'granted') {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setGpsCenter([pos.coords.latitude, pos.coords.longitude]);
                },
                undefined,
                { enableHighAccuracy: false, timeout: 3000, maximumAge: 600000 }
              );
            }
          })
          .catch(() => {});
      }
    } catch (e) {}
  }, []);

  const hasMarker = lat !== null && lng !== null;
  const markerLat = lat ?? gpsCenter?.[0] ?? MARACAIBO_CENTER[0];
  const markerLng = lng ?? gpsCenter?.[1] ?? MARACAIBO_CENTER[1];

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="font-body text-sm font-semibold text-ink">
          {label}
          {required && <span className="text-rojo"> *</span>}
        </label>
      )}
      <div
        className={cn(
          'h-44 w-full overflow-hidden rounded-xl border z-0',
          error ? 'border-danger' : 'border-line',
        )}
      >
        <MapContainer
          center={[markerLat, markerLng]}
          zoom={13}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Picker lat={markerLat} lng={markerLng} hasMarker={hasMarker} onChange={onChange} />
        </MapContainer>
      </div>
      {error ? (
        <p className="font-body text-xs font-semibold text-danger-ink">{error}</p>
      ) : hint ? (
        <p className="font-body text-[11px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
