/* ===========================================================================
   Repositorio de `centers`. Lectura pública de centros aprobados (mapa/lista) y
   lectura del centro propio del admin (RLS lo restringe). El alta de un centro
   nuevo va por el RPC transaccional `register_center` (ver `auth.ts`).
   ========================================================================== */

import type { Center } from '@/types';
import { supabase } from '@/lib/supabase';
import { fromPostgrestError } from './errors';
import { withRetry } from './retry';

/** Columnas que consume la UI (evita `select('*')` para no traer de más). */
const COLUMNS =
  'id, name, address, lat, lng, phone, whatsapp, instagram, website, email, ' +
  'schedule, status, is_approved, is_verified, organization, created_at';

/** Centros aprobados: lo que ve el público en mapa y lista. Sin login. */
export function getApprovedCenters(): Promise<Center[]> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('centers')
      .select(COLUMNS)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });
    if (error) throw fromPostgrestError(error);
    return (data ?? []) as unknown as Center[];
  });
}

/** Centro por id (el admin solo puede leer el suyo por RLS). */
export function getCenterById(id: string): Promise<Center | null> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('centers')
      .select(COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw fromPostgrestError(error);
    return (data as unknown as Center | null) ?? null;
  });
}
