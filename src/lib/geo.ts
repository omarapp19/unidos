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

/**
 * Resultado del forward-geocoding con display name completo para el
 * autocomplete de direcciones.
 */
export interface AddressSuggestion {
  displayName: string;
  lat: number;
  lng: number;
}

/**
 * Búsqueda de direcciones con Nominatim (OSM). Devuelve hasta 5 sugerencias
 * para el autocomplete del formulario de registro.
 * Sin clave de API. Respeta la política de uso: 1 req/seg (el caller debe
 * debounce).
 */
export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5` +
      `&accept-language=es&countrycodes=ve&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Error de red (HTTP ${res.status})`);
    }
    const data = (await res.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
    }>;
    return data
      .map((d) => ({
        displayName: d.display_name,
        lat: Number(d.lat),
        lng: Number(d.lon),
      }))
      .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng));
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Si la petición fue abortada por una nueva pulsación de tecla, no es un error real para mostrar.
      throw error;
    }
    console.error('[Nominatim API Error] Failed to fetch suggestions:', error);
    throw error;
  }
}

/** Caracas como coordenada de respaldo si la geocodificación falla. */
export const DEFAULT_LATLNG: LatLng = { lat: 10.4806, lng: -66.9036 };


/**
 * Forward-geocoding con Nominatim (OSM): convierte una dirección en coordenadas
 * para ubicar un centro recién registrado en el mapa. Sin clave de API.
 * Si la red falla o no hay resultados, devuelve `null` y el caller usa un
 * respaldo (un coordinador puede ajustar la posición al aprobar el centro).
 */
export async function forwardGeocode(
  address: string,
  signal?: AbortSignal,
): Promise<LatLng | null> {
  const q = address.trim();
  if (!q) return null;
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1` +
      `&accept-language=es&countrycodes=ve&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const hit = data[0];
    if (!hit) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}
