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

/** Campos editables de un centro por el superadmin (corrección de datos/coords). */
export interface CenterPatch {
  name?: string;
  organization?: string;
  address?: string;
  schedule?: string;
  phone?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  website?: string | null;
  email?: string | null;
  lat?: number;
  lng?: number;
  status?: Center['status'];
}

/** Datos para registrar un centro huérfano (sin cuenta admin). */
export interface AdminRegisterCenterInput {
  name: string;
  organization: string;
  address: string;
  schedule: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  website?: string;
  email?: string;
  lat: number;
  lng: number;
  isApproved?: boolean;
  isVerified?: boolean;
}

/** Todos los centros (RLS los devuelve solo a superadmin): pendientes primero. */
export function getAllCenters(): Promise<Center[]> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('centers')
      .select(COLUMNS)
      .order('is_approved', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw fromPostgrestError(error);
    return (data ?? []) as unknown as Center[];
  });
}

/** Aprueba un centro (lo hace visible al público). */
export async function approveCenter(id: string): Promise<void> {
  const { error } = await supabase
    .from('centers')
    .update({ is_approved: true })
    .eq('id', id);
  if (error) throw fromPostgrestError(error);
}

/** Marca/desmarca el sello de organización verificada. */
export async function setCenterVerified(id: string, value: boolean): Promise<void> {
  const { error } = await supabase
    .from('centers')
    .update({ is_verified: value })
    .eq('id', id);
  if (error) throw fromPostgrestError(error);
}

/** Edita datos/coordenadas de un centro y devuelve la fila actualizada. */
export function updateCenterAdmin(id: string, patch: CenterPatch): Promise<Center> {
  return new Promise((resolve, reject) => {
    supabase
      .from('centers')
      .update(patch)
      .eq('id', id)
      .select(COLUMNS)
      .single()
      .then(({ data, error }) => {
        if (error) return reject(fromPostgrestError(error));
        resolve(data as unknown as Center);
      });
  });
}

/** Rechaza/elimina un centro (solo superadmin por RLS). */
export async function deleteCenter(id: string): Promise<void> {
  const { error } = await supabase.from('centers').delete().eq('id', id);
  if (error) throw fromPostgrestError(error);
}

/** Registra un centro huérfano vía RPC SECURITY DEFINER. Devuelve su id. */
export async function adminRegisterCenter(
  input: AdminRegisterCenterInput,
): Promise<string> {
  const { data, error } = await supabase.rpc('admin_register_center', {
    p_name: input.name.trim(),
    p_organization: input.organization.trim(),
    p_address: input.address.trim(),
    p_schedule: input.schedule.trim(),
    p_phone: input.phone?.trim() || null,
    p_whatsapp: input.whatsapp?.trim() || null,
    p_instagram: input.instagram?.trim() || null,
    p_website: input.website?.trim() || null,
    p_email: input.email?.trim() || null,
    p_lat: input.lat,
    p_lng: input.lng,
    p_is_approved: input.isApproved ?? true,
    p_is_verified: input.isVerified ?? false,
  });
  if (error) throw fromPostgrestError(error);
  return data as string;
}
