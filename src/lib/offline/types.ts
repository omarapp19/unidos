/* ===========================================================================
   Tipos compartidos del modo offline (cola de donaciones).
   ========================================================================== */

import type { DonationItemInput } from '@/lib/api/donations';

/** Estado de una entrada en la cola de envío. */
export type OutboxStatus = 'pending' | 'error';

/**
 * Una donación registrada localmente que espera (o reintenta) sincronizarse.
 * `clientUuid` es la clave anti-duplicado: viaja al RPC y la BD ignora un
 * segundo insert con el mismo uuid (idempotencia end-to-end).
 */
export interface OutboxEntry {
  clientUuid: string;
  centerId: string;
  donorName: string;
  items: DonationItemInput[];
  /** Epoch ms de cuándo se encoló. */
  createdAt: number;
  status: OutboxStatus;
  /** Nº de intentos de envío fallidos. */
  attempts: number;
  /** Último mensaje de error (para diagnóstico en UI). */
  lastError?: string;
}
