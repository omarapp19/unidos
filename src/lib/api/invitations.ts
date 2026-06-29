/* ===========================================================================
   Invitación por correo del admin de un centro huérfano (mecanismo B).
   - El superadmin envía la invitación vía Edge Function `invite-center-admin`
     (usa la Admin API para mandar el correo).
   - El invitado, ya con sesión (enlace mágico), la acepta con el RPC
     `accept_center_invitation` y queda como admin del centro.
   ========================================================================== */

import type { CenterAdminStatus } from '@/types';
import { supabase } from '@/lib/supabase';
import { ApiError, fromPostgrestError } from './errors';

export interface InviteCenterAdminResult {
  ok: boolean;
  /** true si el correo ya tenía cuenta: se devolvió un enlace para entrar. */
  alreadyRegistered?: boolean;
  /** Enlace de acceso de respaldo (para compartir manualmente si hace falta). */
  actionLink?: string | null;
}

/** Envía la invitación por correo al administrador del centro (solo superadmin). */
export async function inviteCenterAdmin(
  centerId: string,
  email: string,
): Promise<InviteCenterAdminResult> {
  const { data, error } = await supabase.functions.invoke('invite-center-admin', {
    body: { centerId, email: email.trim() },
  });
  if (error) {
    // El cuerpo de error de la función trae un mensaje legible cuando existe.
    const ctx = (error as { context?: { body?: unknown } }).context;
    const msg =
      (ctx?.body && typeof ctx.body === 'object' && 'error' in ctx.body
        ? String((ctx.body as { error: unknown }).error)
        : null) ?? error.message;
    throw new ApiError(msg);
  }
  return data as InviteCenterAdminResult;
}

/** Estado del admin del centro: si tiene admin, su correo y la invitación activa. */
export async function getCenterAdminStatus(
  centerId: string,
): Promise<CenterAdminStatus> {
  const { data, error } = await supabase.rpc('get_center_admin_status', {
    p_center_id: centerId,
  });
  if (error) throw fromPostgrestError(error);
  const row = (data as CenterAdminStatus[] | null)?.[0];
  return (
    row ?? { has_admin: false, admin_email: null, pending_invitation_email: null }
  );
}

/** El invitado (con sesión) acepta la invitación y queda como admin. */
export async function acceptCenterInvitation(): Promise<string> {
  const { data, error } = await supabase.rpc('accept_center_invitation');
  if (error) throw fromPostgrestError(error);
  return data as string;
}
