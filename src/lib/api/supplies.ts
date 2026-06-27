/* ===========================================================================
   Repositorio de `needed_supplies` · insumos críticos más necesitados (lectura pública).
   Permite a los superadministradores añadir o eliminar insumos requeridos.
   ========================================================================== */

import { supabase } from '@/lib/supabase';
import { fromPostgrestError } from './errors';
import { withRetry } from './retry';

export interface NeededSupply {
  id: string;
  name: string;
  center_id?: string | null;
  created_at?: string;
}

export interface CenterSupplyCategory {
  category_id: string;
  category_name: string;
  rank: number;
}

// Semilla local en caso de que la tabla aún no exista en base de datos.
const DEFAULT_SUPPLIES: NeededSupply[] = [
  { id: '1', name: 'Insumos médicos' },
  { id: '2', name: 'Ampollas' },
  { id: '3', name: 'Tabletas' },
];

/** Lista insumos críticos (globales o de un centro específico) ordenados por fecha de creación. */
export function getNeededSupplies(centerId?: string | null): Promise<NeededSupply[]> {
  return withRetry(async () => {
    try {
      let q = supabase
        .from('needed_supplies')
        .select('id, name, center_id, created_at')
        .order('created_at', { ascending: true });
      q = centerId == null ? q.is('center_id', null) : q.eq('center_id', centerId);

      const { data, error } = await q;

      if (error) {
        // Código 42P01: la tabla no existe en PostgreSQL
        if (error.code === '42P01') {
          return centerId == null ? DEFAULT_SUPPLIES : [];
        }
        throw fromPostgrestError(error);
      }
      return data ?? [];
    } catch (err: any) {
      if (err?.code === '42P01' || err?.message?.includes('42P01')) {
        return centerId == null ? DEFAULT_SUPPLIES : [];
      }
      // En cualquier otro error inesperado, usar el fallback para garantizar la operatividad de la landing
      return centerId == null ? DEFAULT_SUPPLIES : [];
    }
  });
}

/** Añade un nuevo insumo al listado (requiere rol de superadmin). */
export function addNeededSupply(name: string, centerId?: string | null): Promise<NeededSupply> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('needed_supplies')
      .insert({ name, center_id: centerId ?? null })
      .select()
      .single();
    if (error) throw fromPostgrestError(error);
    return data;
  });
}

/** Elimina un insumo del listado (requiere rol de superadmin). */
export function deleteNeededSupply(id: string): Promise<void> {
  return withRetry(async () => {
    const { error } = await supabase
      .from('needed_supplies')
      .delete()
      .eq('id', id);
    if (error) throw fromPostgrestError(error);
  });
}

/** Top categorías recibidas por un centro (cualitativo, sin cantidades). */
export function getCenterPublicSummary(centerId: string): Promise<CenterSupplyCategory[]> {
  return withRetry(async () => {
    const { data, error } = await supabase.rpc('get_center_public_summary', {
      p_center_id: centerId,
    });
    if (error) throw fromPostgrestError(error);
    return (data ?? []) as CenterSupplyCategory[];
  });
}

/** Modifica un insumo del listado (requiere rol de superadmin). */
export function updateNeededSupply(id: string, name: string): Promise<NeededSupply> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('needed_supplies')
      .update({ name })
      .eq('id', id)
      .select()
      .single();
    if (error) throw fromPostgrestError(error);
    return data;
  });
}
