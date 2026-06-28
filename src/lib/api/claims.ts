/* ===========================================================================
   Reclamo de centros huérfanos (mecanismo A).
   - Lectura pública de centros sin admin (`list_orphan_centers`).
   - Alta de cuenta nueva + solicitud de reclamo (`claim_center`), atómica desde
     la perspectiva del usuario: signUp → RPC → signOut (queda pendiente de
     aprobación del superadmin, no entra al panel todavía).
   - Gestión del superadmin: listar / aprobar / rechazar solicitudes.
   ========================================================================== */

import type { CenterClaim, OrphanCenter } from '@/types';
import { supabase } from '@/lib/supabase';
import { ApiError, fromPostgrestError } from './errors';
import { withRetry } from './retry';

/** Centros aprobados sin administrador (para el reclamo al registrarse). */
export function listOrphanCenters(search = ''): Promise<OrphanCenter[]> {
  return withRetry(async () => {
    const { data, error } = await supabase.rpc('list_orphan_centers', {
      p_search: search.trim(),
    });
    if (error) throw fromPostgrestError(error);
    return (data ?? []) as OrphanCenter[];
  });
}

export interface ClaimCenterInput {
  email: string;
  password: string;
  centerId: string;
  fullName: string;
  claimantRole?: string;
  evidence?: string;
  contactPhone?: string;
}

/**
 * Crea la cuenta del solicitante y registra una solicitud de reclamo del centro.
 * Tras enviarla cierra la sesión: el usuario no administra nada hasta que el
 * superadmin apruebe (no debe entrar al panel con un perfil sin centro).
 */
export async function claimExistingCenter(input: ClaimCenterInput): Promise<void> {
  const email = input.email.trim();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
  });

  let session = data?.session ?? null;
  if (error) {
    if (error.message === 'User already registered') {
      const { data: signInData, error: signInErr } =
        await supabase.auth.signInWithPassword({ email, password: input.password });
      if (signInErr || !signInData.session) {
        throw new ApiError('Ya existe una cuenta con ese correo.', {
          status: error.status,
          cause: error,
        });
      }
      session = signInData.session;
    } else {
      throw new ApiError(error.message, { status: error.status, cause: error });
    }
  }

  // El proyecto exige confirmar el correo: aún no hay sesión para ejecutar el RPC.
  // Se informa al usuario que confirme y luego reclame desde el registro otra vez.
  if (!session) {
    throw new ApiError(
      'Revisa tu correo para confirmar la cuenta y vuelve a enviar tu solicitud.',
    );
  }

  try {
    const { error: rpcErr } = await supabase.rpc('claim_center', {
      p_center_id: input.centerId,
      p_full_name: input.fullName.trim(),
      p_claimant_role: input.claimantRole?.trim() || null,
      p_evidence: input.evidence?.trim() || null,
      p_contact_phone: input.contactPhone?.trim() || null,
    });
    if (rpcErr) throw fromPostgrestError(rpcErr);
  } finally {
    // El reclamo queda pendiente: no dejamos sesión activa (perfil sin centro).
    await supabase.auth.signOut().catch(() => {});
  }
}

export interface MyClaimStatus {
  status: 'pending' | 'approved' | 'rejected';
  center_name: string;
}

/** Estado de la última solicitud de reclamo del usuario actual (o null si no tiene). */
export async function getMyClaimStatus(): Promise<MyClaimStatus | null> {
  const { data, error } = await supabase.rpc('my_latest_claim_status');
  if (error) throw fromPostgrestError(error);
  return (data as MyClaimStatus[] | null)?.[0] ?? null;
}

/** Solicitudes de reclamo pendientes (solo superadmin). */
export function getCenterClaims(): Promise<CenterClaim[]> {
  return withRetry(async () => {
    const { data, error } = await supabase.rpc('list_center_claims');
    if (error) throw fromPostgrestError(error);
    return (data ?? []) as CenterClaim[];
  });
}

/** Aprueba una solicitud: asigna al solicitante como admin del centro. */
export async function approveCenterClaim(claimId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_center_claim', {
    p_claim_id: claimId,
  });
  if (error) throw fromPostgrestError(error);
}

/**
 * Notifica por correo al solicitante que su reclamo fue aprobado (best-effort:
 * si no hay proveedor de correo configurado, no falla). Devuelve true si se
 * envió. No lances: la aprobación en BD ya ocurrió y no debe revertirse por esto.
 */
export async function notifyClaimApproved(
  email: string,
  centerName: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('notify-claim-approved', {
      body: { email, centerName },
    });
    if (error) return false;
    return Boolean((data as { ok?: boolean } | null)?.ok);
  } catch {
    return false;
  }
}

/** Rechaza una solicitud de reclamo. */
export async function rejectCenterClaim(claimId: string): Promise<void> {
  const { error } = await supabase.rpc('reject_center_claim', {
    p_claim_id: claimId,
  });
  if (error) throw fromPostgrestError(error);
}
