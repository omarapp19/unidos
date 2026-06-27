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
  created_at?: string;
}

// Semilla local en caso de que la tabla aún no exista en base de datos.
const DEFAULT_SUPPLIES: NeededSupply[] = [
  { id: '1', name: 'Insumos médicos' },
  { id: '2', name: 'Ampollas' },
  { id: '3', name: 'Tabletas' },
];

/** Lista todos los insumos críticos ordenados por fecha de creación. */
export function getNeededSupplies(): Promise<NeededSupply[]> {
  return withRetry(async () => {
    try {
      const { data, error } = await supabase
        .from('needed_supplies')
        .select('id, name, created_at')
        .order('created_at', { ascending: true });
      
      if (error) {
        // Código 42P01: la tabla no existe en PostgreSQL
        if (error.code === '42P01') {
          return DEFAULT_SUPPLIES;
        }
        throw fromPostgrestError(error);
      }
      return data ?? [];
    } catch (err: any) {
      if (err?.code === '42P01' || err?.message?.includes('42P01')) {
        return DEFAULT_SUPPLIES;
      }
      // En cualquier otro error inesperado, usar el fallback para garantizar la operatividad de la landing
      return DEFAULT_SUPPLIES;
    }
  });
}

/** Añade un nuevo insumo al listado (requiere rol de superadmin). */
export function addNeededSupply(name: string): Promise<NeededSupply> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('needed_supplies')
      .insert({ name })
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
