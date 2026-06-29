import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button, Card, Input } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { acceptCenterInvitation } from '@/lib/api/invitations';

/* ===========================================================================
   Aceptar invitación de admin de un centro (mecanismo B). El invitado llega
   aquí desde el enlace mágico del correo (ya con sesión). Fija su contraseña y
   reclama el centro vía RPC `accept_center_invitation`; queda como su admin.
   ========================================================================== */

export function AcceptInvitation() {
  const navigate = useNavigate();
  const { status, session, refresh } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      // Fija la contraseña del invitado (entró por enlace mágico, sin contraseña).
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) throw pwErr;
      // Reclama el centro de la invitación: queda como su administrador.
      await acceptCenterInvitation();
      await refresh();
      navigate('/admin/dashboard');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No pudimos aceptar la invitación.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="mx-auto w-full max-w-6xl px-4 py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-body text-sm font-semibold text-body hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver al mapa
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16">
        <Card className="w-full max-w-md">
          {status === 'loading' ? (
            <p className="py-6 text-center font-body text-sm text-muted">
              Validando tu invitación…
            </p>
          ) : !session ? (
            <div className="flex flex-col items-center py-6 text-center">
              <h1 className="font-display text-h2 font-black tracking-snug text-ink">
                Invitación no válida
              </h1>
              <p className="mt-2 max-w-sm font-body text-sm text-body">
                Abre el enlace que te enviamos por correo para aceptar la invitación.
                Si caducó, pide al coordinador que te invite de nuevo.
              </p>
              <Button
                variant="primary"
                size="lg"
                className="mt-6"
                onClick={() => navigate('/admin/login')}
              >
                Ir a iniciar sesión
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-5 flex flex-col items-center text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-success/15 text-success-ink">
                  <CheckCircle2 className="h-6 w-6" aria-hidden />
                </span>
                <h1 className="font-display text-h2 font-black tracking-snug text-ink">
                  Activa tu cuenta de administrador
                </h1>
                <p className="mt-2 font-body text-sm text-body">
                  Crea una contraseña para gestionar tu centro de acopio.
                </p>
              </div>

              <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
                <Input
                  label="Contraseña"
                  requiredMark
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  leadingIcon={<Lock className="h-4 w-4" aria-hidden />}
                  trailingIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="rounded-full p-1.5 hover:bg-surface-2 transition text-muted hover:text-ink focus-visible:shadow-ring-azul focus-visible:outline-none"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  hint="Mínimo 8 caracteres."
                />
                <Input
                  label="Confirmar contraseña"
                  requiredMark
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  leadingIcon={<Lock className="h-4 w-4" aria-hidden />}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />

                {error && (
                  <p className="font-body text-sm font-semibold text-danger-ink">{error}</p>
                )}

                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                  Activar y entrar al panel
                </Button>
              </form>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
