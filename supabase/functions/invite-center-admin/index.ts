// ===========================================================================
// Edge Function: invita por correo al administrador de un centro huérfano.
//
// Flujo (mecanismo B):
//   1. El superadmin (autenticado) llama esta función con { centerId, email }.
//   2. Se verifica que el llamante sea superadmin y que el centro siga huérfano.
//   3. Se registra/actualiza la fila en `center_invitations` (status=pending).
//   4. Se usa la Admin API de Supabase para invitar por correo: el invitado
//      recibe un enlace mágico que lo lleva a /admin/aceptar-invitacion, donde
//      fija su contraseña y reclama el centro (RPC accept_center_invitation).
//
// Requiere las variables de entorno (Supabase las inyecta automáticamente salvo
// APP_URL, que debes definir con `supabase secrets set APP_URL=https://tu-app`):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, APP_URL
// ===========================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const appUrl = Deno.env.get('APP_URL') ?? '';

  // --- 1. Autenticar al llamante y exigir rol superadmin --------------------
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'No autenticado' }, 401);

  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'No autenticado' }, 401);

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (profile?.role !== 'superadmin') {
    return json({ error: 'Solo un superadmin puede invitar' }, 403);
  }

  // --- 2. Validar entrada y estado del centro -------------------------------
  let payload: { centerId?: string; email?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400);
  }
  const centerId = payload.centerId?.trim();
  const email = payload.email?.trim().toLowerCase();
  if (!centerId || !email) {
    return json({ error: 'Faltan centerId o email' }, 400);
  }

  const { data: hasAdmin } = await admin.rpc('_center_has_admin', {
    p_center_id: centerId,
  });
  if (hasAdmin) {
    return json({ error: 'Este centro ya tiene un administrador' }, 409);
  }

  // --- 3. Registrar la invitación (revoca la pendiente anterior, si la hay) --
  await admin
    .from('center_invitations')
    .update({ status: 'revoked' })
    .eq('center_id', centerId)
    .eq('status', 'pending');

  const { error: insErr } = await admin.from('center_invitations').insert({
    center_id: centerId,
    email,
    invited_by: userData.user.id,
  });
  if (insErr) return json({ error: insErr.message }, 400);

  // --- 4. Enviar la invitación por correo (Admin API) -----------------------
  const redirectTo = appUrl ? `${appUrl}/admin/aceptar-invitacion` : undefined;
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { center_id: centerId },
    redirectTo,
  });

  if (inviteErr) {
    // Caso común: el correo ya tiene cuenta. Generamos un magic link en su lugar
    // para que igual pueda entrar y aceptar la invitación.
    const { data: linkData, error: linkErr } =
      await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo },
      });
    if (linkErr) return json({ error: inviteErr.message }, 400);
    return json({
      ok: true,
      alreadyRegistered: true,
      actionLink: linkData.properties?.action_link ?? null,
    });
  }

  return json({ ok: true });
});
