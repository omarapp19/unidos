/* ===========================================================================
   useMutation · hook genérico de escritura (crear/actualizar). Expone `mutate`
   (async, lanza en error para que el llamante decida) y estado loading/error.
   No reintenta automáticamente las mutaciones para no duplicar escrituras; la
   capa de datos solo reintenta lecturas idempotentes.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';
import { toApiError, type ApiError } from '@/lib/api/errors';

export interface MutationState<TArgs, TResult> {
  mutate: (args: TArgs) => Promise<TResult>;
  loading: boolean;
  error: ApiError | null;
  reset: () => void;
}

export function useMutation<TArgs, TResult>(
  mutator: (args: TArgs) => Promise<TResult>,
): MutationState<TArgs, TResult> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  // Marca desmontaje para no actualizar estado tras navegar.
  const setSafe = useCallback(<S,>(setter: (v: S) => void, value: S) => {
    if (mountedRef.current) setter(value);
  }, []);

  const mutate = useCallback(
    async (args: TArgs): Promise<TResult> => {
      setLoading(true);
      setError(null);
      try {
        return await mutator(args);
      } catch (err) {
        const apiErr = toApiError(err);
        setSafe(setError, apiErr);
        throw apiErr;
      } finally {
        setSafe(setLoading, false);
      }
    },
    [mutator, setSafe],
  );

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  return { mutate, loading, error, reset };
}
