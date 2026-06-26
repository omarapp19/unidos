/* ===========================================================================
   Geolocalización · lógica pura del cliente (sin dependencias del backend).
   El cálculo del centro más cercano se hace SOLO en el dispositivo: la posición
   del ciudadano no se almacena (PRD §7).
   ========================================================================== */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Distancia en kilómetros entre dos coordenadas (fórmula de Haversine).
 * Asume la Tierra esférica; error < 0.5%, más que suficiente para ordenar
 * centros por cercanía dentro de una ciudad.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Formatea una distancia en km para mostrar (ej. "850 m", "2,4 km"). */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toLocaleString('es-VE', { maximumFractionDigits: 1 })} km`;
}

/**
 * Devuelve los items ordenados por cercanía a `origin`, cada uno con su
 * distancia en km. No muta el arreglo original. El primero es el más cercano.
 */
export function sortByDistance<T extends LatLng>(
  origin: LatLng,
  items: T[],
): Array<{ item: T; km: number }> {
  return items
    .map((item) => ({ item, km: haversineKm(origin, item) }))
    .sort((a, b) => a.km - b.km);
}

/** El item más cercano a `origin`, o null si la lista está vacía. */
export function nearest<T extends LatLng>(
  origin: LatLng,
  items: T[],
): { item: T; km: number } | null {
  return sortByDistance(origin, items)[0] ?? null;
}

/**
 * Reverse-geocoding del lado del cliente con Nominatim (OpenStreetMap), sin clave de
 * API y sin costo (alineado al stack OSM del TRD). Devuelve una etiqueta corta tipo
 * "Chacao, Caracas" para mostrar la zona detectada en el header.
 *
 * Privacidad (PRD §7): solo se envían las coordenadas a OSM para resolver el nombre de
 * la zona; la ubicación del visitante no se almacena ni pasa por un backend propio.
 * Si la red falla, devuelve `null` y el caller usa un fallback local.
 */
export async function reverseGeocode(
  { lat, lng }: LatLng,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${lat}&lon=${lng}&zoom=14&accept-language=es`;
    const res = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: Record<string, string> };
    const a = data.address ?? {};
    // Zona (barrio/parroquia/suburbio) + ciudad/municipio. Tomamos los dos niveles más
    // útiles disponibles, sin repetir.
    const zone =
      a.neighbourhood ?? a.suburb ?? a.quarter ?? a.city_district ?? a.town ?? a.village;
    const city = a.city ?? a.municipality ?? a.county ?? a.state;
    const parts = [zone, city].filter((p): p is string => Boolean(p));
    const unique = [...new Set(parts)];
    return unique.length > 0 ? unique.join(', ') : null;
  } catch {
    return null; // AbortError o red caída → el caller decide el fallback.
  }
}
