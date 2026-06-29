/* ===========================================================================
   Cola de donaciones offline (outbox) · CRUD sobre el store `outbox`.
   La UI encola aquí cuando no hay conexión (o el envío falla por red); el motor
   de sync (`sync.ts`) lee, reintenta y borra al confirmar.
   ========================================================================== */

import { getDB, OUTBOX_STORE } from './db';
import type { OutboxEntry } from './types';
import type { DonationItemInput } from '@/lib/api/donations';

/** Evento que avisa a la UI que la cola cambió (alta, borrado, error). */
export const OUTBOX_CHANGED_EVENT = 'unidos:outbox-changed';

/** Notifica a quien escuche que el contenido de la cola cambió. */
function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OUTBOX_CHANGED_EVENT));
  }
}

export interface EnqueueInput {
  centerId: string;
  donorName: string;
  items: DonationItemInput[];
}

/**
 * Añade una donación a la cola. Genera el `clientUuid` (clave anti-duplicado) y
 * devuelve la entrada creada. `crypto.randomUUID` está en todos los navegadores
 * objetivo (contexto seguro: https / localhost).
 */
export async function enqueueDonation(input: EnqueueInput): Promise<OutboxEntry> {
  const entry: OutboxEntry = {
    clientUuid: crypto.randomUUID(),
    centerId: input.centerId,
    donorName: input.donorName,
    items: input.items,
    createdAt: Date.now(),
    status: 'pending',
    attempts: 0,
  };
  const db = await getDB();
  await db.put(OUTBOX_STORE, entry);
  notifyChange();
  return entry;
}

/** Todas las entradas en cola, de la más antigua a la más nueva (orden FIFO). */
export async function listOutbox(): Promise<OutboxEntry[]> {
  const db = await getDB();
  const all = await db.getAll(OUTBOX_STORE);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

/** Nº de donaciones pendientes en la cola. */
export async function countOutbox(): Promise<number> {
  const db = await getDB();
  return db.count(OUTBOX_STORE);
}

/** Borra una entrada (tras confirmarse en el servidor). */
export async function removeFromOutbox(clientUuid: string): Promise<void> {
  const db = await getDB();
  await db.delete(OUTBOX_STORE, clientUuid);
  notifyChange();
}

/** Marca una entrada como fallida y suma un intento (se mantiene en cola). */
export async function markEntryError(clientUuid: string, message: string): Promise<void> {
  const db = await getDB();
  const entry = await db.get(OUTBOX_STORE, clientUuid);
  if (!entry) return;
  entry.status = 'error';
  entry.attempts += 1;
  entry.lastError = message;
  await db.put(OUTBOX_STORE, entry);
  notifyChange();
}
