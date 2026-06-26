/* ===========================================================================
   Repositorio de autenticación · envuelve Supabase Auth + perfil del admin.
   - Login / logout / sesión.
   - Alta de centro: signUp + RPC transaccional `register_center`, que crea el
     `center` (is_approved=false) y el `profile` del usuario en una operación.
   ========================================================================== */

import type { Session } from '@supabase/supabase-js';
import type { Profile } from '@/types';
import { supabase } from '@/lib/supabase';
import { ApiError, fromPostgrestError, toApiError } from './errors';
import { withRetry } from './retry';

/** Inicia sesión con correo y contraseña. Devuelve la sesión. */
export async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    // Auth no es transitorio: credenciales malas no mejoran al reintentar.
    throw new ApiError(
      error.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos.'
        : error.message,
      { status: error.status, cause: error },
    );
  }
  return data.session!;
}

/** Cierra la sesión actual. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw toApiError(error);
}

/** Sesión actual (o null si no hay). */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw toApiError(error);
  return data.session;
}

/** Perfil del admin (RLS: cada quien ve el suyo). Null si aún no existe. */
export function getProfile(userId: string): Promise<Profile | null> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, center_id, role, full_name')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw fromPostgrestError(error);
    return (data as Profile | null) ?? null;
  });
}

export interface RegisterCenterInput {
  email: string;
  password: string;
  name: string;
  organization: string;
  address: string;
  schedule: string;
  phone?: string;
  /** WhatsApp en formato internacional (solo dígitos, ej. "584125550142"). */
  whatsapp?: string;
  /** Usuario de Instagram sin @. */
  instagram?: string;
  /** Sitio web (URL completa). */
  website?: string;
  /** Coordenadas del centro (geocodificadas desde la dirección). */
  lat: number;
  lng: number;
  /** Nombre del responsable; por defecto se usa el del centro. */
  fullName?: string;
}

export interface RegisterCenterResult {
  /** true si Supabase devolvió sesión (sin confirmación de correo pendiente). */
  hasSession: boolean;
  /** Id del centro creado, si la sesión permitió ejecutar el RPC. */
  centerId?: string;
}

/**
 * Crea la cuenta del admin y, si hay sesión inmediata, su centro + perfil vía
 * RPC `register_center`. Si el proyecto exige confirmar el correo, no habrá
 * sesión todavía: se informa `hasSession=false` para mostrar "revisa tu correo"
 * y el centro se crea en el primer login (ver `ensureCenterFromPending`* futuro).
 */
export async function registerCenter(
  input: RegisterCenterInput,
): Promise<RegisterCenterResult> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
  });
  if (error) {
    throw new ApiError(
      error.message === 'User already registered'
        ? 'Ya existe una cuenta con ese correo.'
        : error.message,
      { status: error.status, cause: error },
    );
  }

  if (!data.session) return { hasSession: false };

  const centerId = await withRetry(async () => {
    const { data: id, error: rpcErr } = await supabase.rpc('register_center', {
      p_name: input.name.trim(),
      p_organization: input.organization.trim(),
      p_address: input.address.trim(),
      p_schedule: input.schedule.trim(),
      p_phone: input.phone?.trim() || null,
      p_whatsapp: input.whatsapp?.trim() || null,
      p_instagram: input.instagram?.trim() || null,
      p_website: input.website?.trim() || null,
      p_email: input.email.trim(),
      p_lat: input.lat,
      p_lng: input.lng,
      p_full_name: (input.fullName ?? input.name).trim(),
    });
    if (rpcErr) throw fromPostgrestError(rpcErr);
    return id as string;
  });

  return { hasSession: true, centerId };
}
