// ===========================================================================
// Edge Function: notifica por correo al solicitante que su reclamo de centro
// fue APROBADO (ya es administrador). Lo llama el superadmin tras aprobar.
//
// Usa Resend como proveedor transaccional. Si no hay RESEND_API_KEY configurada
// no falla: devuelve { ok: false, skipped: true } y el flujo de aprobación
// (que ya asignó el admin en la BD) continúa sin email.
//
// Secrets:
//   supabase secrets set RESEND_API_KEY=...    (obligatoria para enviar)
//   supabase secrets set NOTIFY_FROM="Unidos <no-reply@tu-dominio.org>"
//   supabase secrets set APP_URL=https://tu-app   (para el enlace de acceso)
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
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('NOTIFY_FROM') ?? 'Unidos <onboarding@resend.dev>';
  const appUrl = Deno.env.get('APP_URL') ?? '';

  // Autenticar al llamante y exigir rol superadmin.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
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
    return json({ error: 'Solo un superadmin puede notificar' }, 403);
  }

  let payload: { email?: string; centerName?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400);
  }
  const email = payload.email?.trim();
  const centerName = payload.centerName?.trim() || 'tu centro';
  if (!email) return json({ error: 'Falta email' }, 400);

  // Sin proveedor de correo configurado: no es un error, solo se omite el envío.
  if (!resendKey) return json({ ok: false, skipped: true });

  const loginUrl = appUrl ? `${appUrl}/admin/login` : '';
  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:15px;color:#1a1a1a">
      <h2>¡Tu solicitud fue aprobada! 🎉</h2>
      <p>Ya eres administrador de <strong>${centerName}</strong> en Unidos.</p>
      <p>Inicia sesión con tu correo y contraseña para gestionar tu centro de acopio${
        loginUrl ? ` aquí: <a href="${loginUrl}">${loginUrl}</a>` : '.'
      }</p>
    </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `Aprobado: ya administras ${centerName}`,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return json({ ok: false, error: detail }, 502);
  }
  return json({ ok: true });
});
