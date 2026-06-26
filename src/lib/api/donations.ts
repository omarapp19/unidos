/* ===========================================================================
   Repositorio de `donations` / `donation_items`.
   - Vista pública: solo los ítems (categoría + cantidad) para el gráfico de red;
     `donations` queda fuera del alcance público (RLS), preservando los nombres.
   - Panel privado: donaciones e ítems del propio centro.
   - Alta: RPC transaccional `create_donation` (donación + ítems en un INSERT).
   ========================================================================== */

import type { Donation, DonationItem } from '@/types';
import { supabase } from '@/lib/supabase';
import { fromPostgrestError } from './errors';
import { withRetry } from './retry';

/** Normaliza `quantity` (numeric de Postgres) a number por si llega como string. */
function toItem(row: DonationItem): DonationItem {
  return { ...row, quantity: Number(row.quantity) };
}

/**
 * Ítems de toda la red para el gráfico público (§1.C). Solo categoría y cantidad;
 * nunca `donor_name`. RLS permite SELECT público sobre `donation_items`.
 */
export function getNetworkDonationItems(): Promise<DonationItem[]> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('donation_items')
      .select('id, donation_id, category_id, product, quantity');
    if (error) throw fromPostgrestError(error);
    return (data ?? []).map(toItem);
  });
}

export interface CenterDonations {
  donations: Donation[];
  items: DonationItem[];
}

/**
 * Donaciones e ítems del centro indicado (panel privado). RLS garantiza que el
 * admin solo recibe los de su centro. Dos consultas: cabeceras + ítems ligados.
 */
export function getCenterDonations(centerId: string): Promise<CenterDonations> {
  return withRetry(async () => {
    const { data: donations, error: dErr } = await supabase
      .from('donations')
      .select('id, center_id, donor_name, is_anonymous, created_at, created_by')
      .eq('center_id', centerId)
      .order('created_at', { ascending: false });
    if (dErr) throw fromPostgrestError(dErr);

    const ids = (donations ?? []).map((d) => d.id);
    if (ids.length === 0) return { donations: donations ?? [], items: [] };

    const { data: items, error: iErr } = await supabase
      .from('donation_items')
      .select('id, donation_id, category_id, product, quantity')
      .in('donation_id', ids);
    if (iErr) throw fromPostgrestError(iErr);

    return { donations: donations ?? [], items: (items ?? []).map(toItem) };
  });
}

/** Un ítem a registrar (sin ids: los genera la BD). */
export interface DonationItemInput {
  category_id: string;
  product: string;
  quantity: number;
}

export interface CreateDonationInput {
  centerId: string;
  /** Vacío/espacios ⇒ anónimo (el RPC normaliza a NULL). */
  donorName: string;
  items: DonationItemInput[];
}

/**
 * Crea la donación y sus ítems de forma atómica vía RPC `create_donation`
 * (un solo round-trip; o todo o nada). Devuelve el id de la donación creada.
 */
export function createDonation(input: CreateDonationInput): Promise<string> {
  const donorName = input.donorName.trim();
  return withRetry(async () => {
    const { data, error } = await supabase.rpc('create_donation', {
      p_center_id: input.centerId,
      p_donor_name: donorName === '' ? null : donorName,
      p_items: input.items,
    });
    if (error) throw fromPostgrestError(error);
    return data as string;
  });
}
