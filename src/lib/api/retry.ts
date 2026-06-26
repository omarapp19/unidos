/* ===========================================================================
   Reintentos con backoff exponencial + jitter. Solo reintenta errores marcados
   como `retryable` (red caída o 5xx); nunca reintenta 4xx/RLS/validación, que no
   mejoran al repetir. Mantiene la capa de datos resiliente sin enmascarar bugs.
   ========================================================================== */

import { toApiError, type ApiError } from './errors';

export interface RetryOptions {
  /** Reintentos adicionales tras el primer intento (por defecto 2 ⇒ 3 intentos). */
  retries?: number;
  /** Retardo base en ms (se duplica en cada intento). */
  baseDelayMs?: number;
  /** Tope del retardo en ms. */
  maxDelayMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Ejecuta `fn`, reintentando solo si lanza un `ApiError` con `retryable=true`.
 * Normaliza cualquier excepción a `ApiError` antes de devolverla.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 2, baseDelayMs = 300, maxDelayMs = 4000 }: RetryOptions = {},
): Promise<T> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (raw) {
      const err: ApiError = toApiError(raw);
      if (!err.retryable || attempt >= retries) throw err;
      const backoff = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      const jitter = Math.random() * baseDelayMs;
      await sleep(backoff + jitter);
      attempt += 1;
    }
  }
}
