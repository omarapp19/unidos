/* ===========================================================================
   Errores de la capa de datos · normaliza lo que devuelve Supabase a un tipo
   único (`ApiError`) con un mensaje en español listo para mostrar al usuario y
   metadatos (`status`, `code`, `retryable`) para decidir reintentos.
   ========================================================================== */

import type { PostgrestError } from '@supabase/supabase-js';

export class ApiError extends Error {
  /** Código HTTP si lo hubo (p. ej. 500). */
  readonly status?: number;
  /** Código de PostgREST/Postgres (p. ej. '23505', 'PGRST116'). */
  readonly code?: string;
  /** ¿Tiene sentido reintentar? (fallo de red o error transitorio del servidor). */
  readonly retryable: boolean;
  /** Causa original, por si se quiere registrar. */
  readonly cause?: unknown;

  constructor(
    message: string,
    opts: { status?: number; code?: string; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.retryable = opts.retryable ?? false;
    this.cause = opts.cause;
  }
}

/** Mensaje genérico cuando no hay uno mejor. */
const FALLBACK = 'Ocurrió un error inesperado. Intenta de nuevo.';

/** ¿Un error de red del navegador (fetch falló, sin conexión)? */
function isNetworkError(err: unknown): boolean {
  return (
    err instanceof TypeError ||
    (err instanceof Error && /fetch|network|failed to fetch/i.test(err.message))
  );
}

/** Convierte un `PostgrestError` de Supabase en `ApiError`. */
export function fromPostgrestError(error: PostgrestError): ApiError {
  // PostgREST expone el HTTP en `.code` solo para algunos; usamos heurística.
  const status = Number((error as { status?: number }).status) || undefined;
  const retryable = status !== undefined && status >= 500;
  return new ApiError(error.message || FALLBACK, {
    status,
    code: error.code,
    retryable,
    cause: error,
  });
}

/** Convierte cualquier excepción capturada (red, auth, etc.) en `ApiError`. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isNetworkError(error)) {
    return new ApiError(
      'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
      { retryable: true, cause: error },
    );
  }
  if (error instanceof Error) {
    const status = (error as { status?: number }).status;
    return new ApiError(error.message || FALLBACK, {
      status,
      retryable: status !== undefined && status >= 500,
      cause: error,
    });
  }
  return new ApiError(FALLBACK, { cause: error });
}
