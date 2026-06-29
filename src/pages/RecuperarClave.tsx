import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, MailCheck } from 'lucide-react';
import { requestPasswordReset } from '@/lib/api/auth';
import { isValidEmail } from '@/lib/validation';
import { Button, Card, Input } from '@/components/ui';

/* ===========================================================================
   Solicitud de recuperación de contraseña. El usuario ingresa su correo y, si
   está registrado, Supabase le envía un enlace a /admin/nueva-clave. No
   revelamos si el correo existe: siempre mostramos el mismo mensaje de éxito.
   ========================================================================== */

export function RecuperarClave() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError('Ingresa un correo válido.');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/admin/nueva-clave`;
      await requestPasswordReset(email, redirectTo);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar el correo.');
    } finally {
      setLoading(false);
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
          {sent ? (
            <div className="flex flex-col items-center text-center">
              <MailCheck className="mb-3 h-12 w-12 text-verde" aria-hidden />
              <h1 className="font-display text-h2 font-black tracking-snug text-ink">
                Revisa tu correo
              </h1>
              <p className="mt-2 font-body text-sm text-body">
                Si <span className="font-semibold text-ink">{email.trim()}</span> está
                registrado, te enviamos un enlace para restablecer tu contraseña. Revisa
                también la carpeta de spam.
              </p>
              <Button
                className="mt-6"
                variant="ghost"
                size="lg"
                fullWidth
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
              >
                Usar otro correo
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col items-center text-center">
                <h1 className="font-display text-h2 font-black tracking-snug text-ink">
                  Recuperar contraseña
                </h1>
                <p className="mt-1 font-body text-sm text-body">
                  Ingresa el correo de tu cuenta y te enviaremos un enlace para crear una
                  nueva contraseña.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <Input
                  label="Correo"
                  type="email"
                  autoComplete="email"
                  placeholder="centro@organizacion.org"
                  leadingIcon={<Mail className="h-4 w-4" aria-hidden />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={error ?? undefined}
                />
                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                  Enviar enlace
                </Button>
              </form>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
