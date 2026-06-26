/* ===========================================================================
   Repositorio de `categories` · catálogo controlado de insumos (lectura pública).
   ========================================================================== */

import type { Category } from '@/types';
import { supabase } from '@/lib/supabase';
import { fromPostgrestError } from './errors';
import { withRetry } from './retry';

/** Lista todas las categorías ordenadas por nombre. */
export function getCategories(): Promise<Category[]> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, unit')
      .order('name', { ascending: true });
    if (error) throw fromPostgrestError(error);
    return data ?? [];
  });
}
