/* ===========================================================================
   Motor de sincronización de la cola offline. Recorre las donaciones pendientes
   (FIFO) y las envía al servidor vía `createDonation`, pasando el `clientUuid`
   para que un reenvío no duplique (idempotencia end-to-end).

   Disparadores (ver `useOfflineSync`): evento `online`, carga de la app y botón
   manual "Sincronizar ahora". Un flag evita dos flushes simultáneos.

   Política de error por entrada:
     · éxito           → se borra de la cola.
     · error de red    → se marca y se DETIENE el flush (seguimos sin conexión).
     · error definitivo→ se marca como error y se continúa con la siguiente.
   ========================================================================== */

import { createDonation } from '@/lib/api/donations';
import { toApiError } from '@/lib/api/errors';
import { listOutbox, removeFromOutbox, markEntryError } from './outbox';

export interface FlushResult {
  /** Donaciones confirmadas en el servidor en este flush. */
  sent: number;
  /** Entradas que quedaron en cola (red caída o error). */
  remaining: number;
  /** Si se cortó por un fallo de red (sigue sin conexión real). */
  stoppedByNetwork: boolean;
}

let flushing = false;

/**
 * Envía la cola pendiente. Idempotente frente a llamadas solapadas: si ya hay
 * un flush en curso, devuelve un resultado vacío en vez de duplicar trabajo.
 */
export async function flushOutbox(): Promise<FlushResult> {
  if (flushing) return { sent: 0, remaining: await safeCount(), stoppedByNetwork: false };
  flushing = true;
  try {
    const entries = await listOutbox();
    let sent = 0;
    let stoppedByNetwork = false;

    for (const entry of entries) {
      try {
        await createDonation({
          centerId: entry.centerId,
          donorName: entry.donorName,
          items: entry.items,
          clientUuid: entry.clientUuid,
        });
        await removeFromOutbox(entry.clientUuid);
        sent += 1;
      } catch (err) {
        const apiErr = toApiError(err);
        await markEntryError(entry.clientUuid, apiErr.message);
        if (apiErr.retryable) {
          // Sigue sin conexión: no tiene sentido intentar el resto ahora.
          stoppedByNetwork = true;
          break;
        }
        // Error definitivo (validación/permiso): se queda marcada y seguimos.
      }
    }

    return { sent, remaining: await safeCount(), stoppedByNetwork };
  } finally {
    flushing = false;
  }
}

async function safeCount(): Promise<number> {
  try {
    return (await listOutbox()).length;
  } catch {
    return 0;
  }
}
