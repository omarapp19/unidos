/* ===========================================================================
   useOfflineSync · estado del modo offline para la UI.
   Expone: si hay conexión, cuántas donaciones esperan en cola, si está
   sincronizando y un `syncNow()` para forzar el envío.

   Dispara el flush automáticamente al recuperar conexión (`online`) y al montar
   (por si quedó cola de una sesión anterior). El botón manual llama `syncNow`.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';
import { countOutbox, OUTBOX_CHANGED_EVENT } from './outbox';
import { flushOutbox } from './sync';

export interface OfflineSyncState {
  online: boolean;
  /** Donaciones en cola esperando envío. */
  pending: number;
  syncing: boolean;
  /** Fuerza un intento de envío de la cola. */
  syncNow: () => Promise<void>;
}

function getOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function useOfflineSync(): OfflineSyncState {
  const [online, setOnline] = useState(getOnline);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const mounted = useRef(true);

  const refreshCount = useCallback(async () => {
    const n = await countOutbox();
    if (mounted.current) setPending(n);
  }, []);

  const syncNow = useCallback(async () => {
    if (!mounted.current) return;
    setSyncing(true);
    try {
      await flushOutbox();
    } finally {
      if (mounted.current) setSyncing(false);
      await refreshCount();
    }
  }, [refreshCount]);

  useEffect(() => {
    mounted.current = true;
    void refreshCount();

    const onOnline = () => {
      setOnline(true);
      void syncNow();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener(OUTBOX_CHANGED_EVENT, refreshCount);

    // Cola heredada de una sesión previa: intenta enviarla si hay conexión.
    if (getOnline()) void syncNow();

    return () => {
      mounted.current = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener(OUTBOX_CHANGED_EVENT, refreshCount);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { online, pending, syncing, syncNow };
}
