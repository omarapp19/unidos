/* ===========================================================================
   Validadores puros reutilizados por los formularios de registro de centros.
   Sin dependencias de React: solo reciben strings y devuelven booleanos o el
   valor normalizado que se persiste en la BD.
   ========================================================================== */

/** Correo con formato válido (suficiente para front; el back lo reconfirma). */
export function isValidEmail(value: string): boolean {
  const v = value.trim();
  // Local-part sin espacios + dominio con al menos un punto y TLD de 2+ letras.
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);
}

/**
 * Usuario de Instagram válido (sin @): 1-30 caracteres, letras/números/._,
 * no puede empezar/terminar en punto ni llevar puntos consecutivos.
 */
export function isValidInstagram(value: string): boolean {
  const handle = value.trim().replace(/^@/, '');
  if (handle.length === 0 || handle.length > 30) return false;
  if (handle.startsWith('.') || handle.endsWith('.')) return false;
  if (handle.includes('..')) return false;
  return /^[A-Za-z0-9._]+$/.test(handle);
}

/** Normaliza un usuario de Instagram para guardar: sin @ ni espacios. */
export function normalizeInstagram(value: string): string {
  return value.trim().replace(/^@/, '');
}

/** URL http(s) válida con host con punto (ej. https://cruzroja.org.ve). */
export function isValidUrl(value: string): boolean {
  const v = value.trim();
  try {
    const url = new URL(v);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return url.hostname.includes('.');
  } catch {
    return false;
  }
}

/** Antepone https:// si el usuario no escribió protocolo. */
export function normalizeUrl(value: string): string {
  const v = value.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

/**
 * Valida el número nacional (sin código de país): solo dígitos tras quitar
 * separadores, entre 6 y 14 cifras (cubre el rango E.164 nacional).
 */
export function isValidPhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 14;
}

/** Solo los dígitos de un número (quita espacios, guiones, paréntesis). */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Número internacional listo para `wa.me` y almacenamiento: dígitos del código
 * de país + dígitos del número, sin `+` ni separadores (ej. "584125550142").
 */
export function toWhatsAppNumber(dial: string, number: string): string {
  return phoneDigits(dial) + phoneDigits(number);
}

/** Teléfono legible para mostrar/guardar (ej. "+58 412 555 0142"). */
export function formatPhone(dial: string, number: string): string {
  const n = number.trim();
  return n ? `${dial} ${n}` : '';
}
