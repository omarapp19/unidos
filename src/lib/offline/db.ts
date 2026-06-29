/* ===========================================================================
   IndexedDB · única base local para el modo offline. De momento solo guarda la
   "outbox": donaciones registradas sin conexión que esperan sincronizarse.
   Usa `idb` (envoltorio fino y tipado sobre IndexedDB). La conexión se abre una
   sola vez (lazy singleton) y se reutiliza en toda la app.
   ========================================================================== */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { OutboxEntry } from './types';

const DB_NAME = 'unidos-offline';
const DB_VERSION = 1;

export const OUTBOX_STORE = 'outbox' as const;

interface UnidosDB extends DBSchema {
  [OUTBOX_STORE]: {
    key: string; // clientUuid
    value: OutboxEntry;
    indexes: { by_status: OutboxEntry['status'] };
  };
}

let dbPromise: Promise<IDBPDatabase<UnidosDB>> | null = null;

/** Abre (o reutiliza) la base local. Crea el store `outbox` en la primera vez. */
export function getDB(): Promise<IDBPDatabase<UnidosDB>> {
  if (!dbPromise) {
    dbPromise = openDB<UnidosDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(OUTBOX_STORE, { keyPath: 'clientUuid' });
        store.createIndex('by_status', 'status');
      },
    });
  }
  return dbPromise;
}

/** Solo para tests: descarta el singleton para reabrir contra una BD limpia. */
export function __resetDBForTests() {
  dbPromise = null;
}
