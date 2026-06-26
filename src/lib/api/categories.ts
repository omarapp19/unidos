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

/** Crea una categoría (solo superadmin por RLS). Devuelve la fila creada. */
export async function createCategory(input: {
  name: string;
  unit: string;
}): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: input.name.trim(), unit: input.unit.trim() })
    .select('id, name, unit')
    .single();
  if (error) throw fromPostgrestError(error);
  return data as Category;
}

/** Actualiza nombre/unidad de una categoría (solo superadmin). */
export async function updateCategory(
  id: string,
  patch: { name?: string; unit?: string },
): Promise<Category> {
  const clean: { name?: string; unit?: string } = {};
  if (patch.name !== undefined) clean.name = patch.name.trim();
  if (patch.unit !== undefined) clean.unit = patch.unit.trim();
  const { data, error } = await supabase
    .from('categories')
    .update(clean)
    .eq('id', id)
    .select('id, name, unit')
    .single();
  if (error) throw fromPostgrestError(error);
  return data as Category;
}

/** Elimina una categoría (solo superadmin). Falla si tiene ítems (FK RESTRICT). */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw fromPostgrestError(error);
}
