/* ===========================================================================
   Caché de lectura con TTL para minimizar consultas a Supabase bajo carga alta
   (miles de lecturas simultáneas). Tres capas:
     1. Memoria: respuesta válida dentro del TTL ⇒ no toca la red.
     2. Coalescencia: llamadas idénticas en vuelo comparten UNA sola petición
        (evita ráfagas por StrictMode, montajes paralelos, etc.).
     3. localStorage: sobrevive recargas; una recarga dentro del TTL = 0 consultas.
   Filosofía: mejor datos con algo de retraso que un 500 por saturar la BD.
   Las mutaciones del admin invalidan las claves afectadas (ver `invalidate`).
   ========================================================================== */

interface Entry<T> {
  value: T;
  /** Marca de tiempo (epoch ms) en que vence la entrada. */
  expiresAt: number;
}

/** TTL por defecto: 5 min (rango recomendado 5–10 min para la lista de centros). */
export const DEFAULT_TTL_MS = 5 * 60 * 1000;

const memory = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const STORAGE_PREFIX = 'cache:';

/** Lee de localStorage si la entrada existe y no venció. Tolerante a fallos. */
function readStorage<T>(key: string): Entry<T> | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (Date.now() >= entry.expiresAt) {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    return entry;
  } catch {
    return null; // SSR, modo privado, cuota llena, JSON corrupto: degradar sin romper.
  }
}

function writeStorage<T>(key: string, entry: Entry<T>): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    /* cuota llena / no disponible: la caché en memoria sigue funcionando. */
  }
}

/**
 * Devuelve el valor cacheado para `key` si está vigente; si no, ejecuta `fetcher`
 * una sola vez (coalesciendo llamadas concurrentes) y cachea el resultado.
 */
export function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const now = Date.now();

  const mem = memory.get(key) as Entry<T> | undefined;
  if (mem && now < mem.expiresAt) return Promise.resolve(mem.value);

  if (!mem) {
    const stored = readStorage<T>(key);
    if (stored) {
      memory.set(key, stored);
      return Promise.resolve(stored.value);
    }
  }

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = fetcher()
    .then((value) => {
      const entry: Entry<T> = { value, expiresAt: Date.now() + ttlMs };
      memory.set(key, entry);
      writeStorage(key, entry);
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/**
 * Invalida entradas cuya clave empieza por `prefix` (o todas si se omite).
 * Llamar tras mutaciones que cambian datos públicos (aprobar/editar/borrar centro).
 */
export function invalidate(prefix = ''): void {
  for (const key of [...memory.keys()]) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
  for (const key of [...inflight.keys()]) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX + prefix)) localStorage.removeItem(k);
    }
  } catch {
    /* localStorage no disponible: nada que limpiar. */
  }
}
