import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exchangeRecoveryCode, updatePassword } from '@/lib/api/auth';
import { PasswordPairForm } from '@/components/form';
import { Button, Card, Spinner } from '@/components/ui';

/* ===========================================================================
   Destino del enlace de recuperación. Supabase detecta el token en la URL
   (detectSessionInUrl) y emite el evento PASSWORD_RECOVERY, creando una sesión
   temporal con la que actualizamos la contraseña. Si no llega ninguna sesión
   de recuperación (enlace inválido o expirado), ofrecemos volver a solicitarla.
   ========================================================================== */

type Status = 'checking' | 'ready' | 'invalid' | 'done';

export function NuevaClave() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('checking');
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Resuelve si hay una sesión válida con la que cambiar la contraseña. Escucha
  // PASSWORD_RECOVERY (flujo por hash) y, como respaldo, intercambia el `code`
  // del flujo PKCE. Si tras una espera corta no hay sesión, el enlace es inválido.
  useEffect(() => {
    let active = true;
    let settled = false;

    const markReady = () => {
      if (!active || settled) return;
      settled = true;
      setStatus('ready');
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        markReady();
      }
    });

    (async () => {
      try {
        await exchangeRecoveryCode(window.location.href);
      } catch {
        // Código ausente o inválido: caemos al chequeo de sesión de abajo.
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) markReady();
    })();

    // Si en 4 s no apareció sesión de recuperación, tratamos el enlace como inválido.
    const timer = window.setTimeout(() => {
      if (active && !settled) setStatus('invalid');
    }, 4000);

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(password: string) {
    setServerError(null);
    setSaving(true);
    try {
      await updatePassword(password);
      setStatus('done');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No pudimos guardar la contraseña.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="mx-auto w-full max-w-6xl px-4 py-4">
        <Link
          to="/admin/login"
          className="inline-flex items-center gap-2 font-body text-sm font-semibold text-body hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver al inicio de sesión
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-md">
          {status === 'checking' && (
            <div className="flex flex-col items-center py-6">
              <Spinner label="Validando el enlace…" />
            </div>
          )}

          {status === 'invalid' && (
            <div className="flex flex-col items-center text-center">
              <h1 className="font-display text-h2 font-black tracking-snug text-ink">
                Enlace inválido o expirado
              </h1>
              <p className="mt-2 font-body text-sm text-body">
                El enlace para restablecer la contraseña no es válido o ya caducó. Solicita
                uno nuevo.
              </p>
              <Button
                className="mt-6"
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => navigate('/admin/recuperar')}
              >
                Solicitar un nuevo enlace
              </Button>
            </div>
          )}

          {status === 'ready' && (
            <>
              <div className="mb-6 flex flex-col items-center text-center">
                <h1 className="font-display text-h2 font-black tracking-snug text-ink">
                  Crea una nueva contraseña
                </h1>
                <p className="mt-1 font-body text-sm text-body">
                  Elige una contraseña segura para tu cuenta.
                </p>
              </div>
              <PasswordPairForm
                onSubmit={handleSubmit}
                loading={saving}
                serverError={serverError}
                submitLabel="Cambiar contraseña"
              />
            </>
          )}

          {status === 'done' && (
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="mb-3 h-12 w-12 text-verde" aria-hidden />
              <h1 className="font-display text-h2 font-black tracking-snug text-ink">
                Contraseña actualizada
              </h1>
              <p className="mt-2 font-body text-sm text-body">
                Ya puedes usar tu nueva contraseña.
              </p>
              <Button
                className="mt-6"
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => navigate('/admin')}
              >
                Ir al panel
              </Button>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
