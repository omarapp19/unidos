import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { updatePassword } from '@/lib/api/auth';
import { PasswordPairForm } from '@/components/form';
import { Button, Card, Spinner } from '@/components/ui';

/* ===========================================================================
   Cuenta del usuario autenticado: cambio de contraseña sin pasar por el correo.
   Ruta de nivel superior (no anidada en los layouts) para que sirva a admins y
   superadmins por igual; solo exige una sesión válida.
   ========================================================================== */

export function Cuenta() {
  const navigate = useNavigate();
  const { status, profile } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner label="Cargando…" />
      </div>
    );
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/admin/login" replace />;
  }

  const backTo = profile?.role === 'superadmin' ? '/admin/super' : '/admin';

  async function handleSubmit(password: string) {
    setServerError(null);
    setSaving(true);
    try {
      await updatePassword(password);
      setDone(true);
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
          to={backTo}
          className="inline-flex items-center gap-2 font-body text-sm font-semibold text-body hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver al panel
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-md">
          {done ? (
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="mb-3 h-12 w-12 text-verde" aria-hidden />
              <h1 className="font-display text-h2 font-black tracking-snug text-ink">
                Contraseña actualizada
              </h1>
              <p className="mt-2 font-body text-sm text-body">
                Tu contraseña se cambió correctamente.
              </p>
              <Button
                className="mt-6"
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => navigate(backTo)}
              >
                Volver al panel
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col items-center text-center">
                <h1 className="font-display text-h2 font-black tracking-snug text-ink">
                  Cambiar contraseña
                </h1>
                <p className="mt-1 font-body text-sm text-body">
                  Elige una contraseña nueva para tu cuenta.
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
        </Card>
      </main>
    </div>
  );
}
