/* ===========================================================================
   useQuery · hook genérico de lectura. Maneja loading/error/data y reintento
   manual (`refetch`). Ignora respuestas obsoletas si las dependencias cambian o
   el componente se desmonta (evita "setState en componente desmontado" y carreras
   bajo StrictMode). La capa de datos ya hace reintentos automáticos de red.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';
import { toApiError, type ApiError } from '@/lib/api/errors';

export interface QueryState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  /** Vuelve a ejecutar la consulta (p. ej. tras un error o una mutación). */
  refetch: () => void;
}

/**
 * @param fetcher  función async que devuelve los datos.
 * @param deps     dependencias; al cambiar, se relanza la consulta.
 * @param enabled  si es false, no ejecuta (útil para consultas dependientes).
 */
export function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
  enabled = true,
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  // Cuenta de ejecución: solo la última aplica su resultado.
  const runIdRef = useRef(0);

  const run = useCallback(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const runId = ++runIdRef.current;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (runId === runIdRef.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (runId === runIdRef.current) {
          setError(toApiError(err));
          setLoading(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    run();
    // Invalida la ejecución en curso al desmontar/cambiar deps.
    return () => {
      runIdRef.current++;
    };
  }, [run]);

  const refetch = useCallback(() => run(), [run]);

  return { data, error, loading, refetch };
}
