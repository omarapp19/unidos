import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Une clases condicionales (clsx) y resuelve conflictos de Tailwind
 * (tailwind-merge), p. ej. `cn('p-2', condicion && 'p-4')` → 'p-4'.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Construye el deep link para abrir indicaciones hacia un centro.
 * En móvil se prefiere el esquema `geo:` (abre la app de mapas nativa);
 * como destino universal y fallback de escritorio se usa Google Maps.
 */
export function buildDirectionsUrl(
  lat: number,
  lng: number,
  label?: string,
): { geo: string; web: string } {
  const q = label ? `(${encodeURIComponent(label)})` : '';
  return {
    geo: `geo:${lat},${lng}?q=${lat},${lng}${q}`,
    web: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  };
}
