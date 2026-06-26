import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button, Card, Input } from '@/components/ui';

/* ===========================================================================
   Login del administrador (PRD Módulo 2). Autentica con Supabase Auth vía
   useAuth().signIn; al éxito entra al panel. El AuthProvider carga el perfil y
   el centro del usuario a partir de la sesión.
   ========================================================================== */

export function AdminLogin() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="mx-auto w-full max-w-6xl px-4 py-4">
        <Link to="/" className="inline-flex items-center gap-2 font-body text-sm font-semibold text-body hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver al mapa
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-rojo text-white">
              <MapPin className="h-6 w-6" aria-hidden />
            </span>
            <h1 className="font-display text-h2 font-black tracking-snug text-ink">
              Panel del centro
            </h1>
            <p className="mt-1 font-body text-sm text-body">
              Inicia sesión para registrar donaciones y ver tu panel.
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
            />
            <Input
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              leadingIcon={<Lock className="h-4 w-4" aria-hidden />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error ?? undefined}
            />
            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
              Iniciar sesión
            </Button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-2 border-t border-line-soft pt-5">
            <p className="font-body text-sm text-body">¿Aún no tienes una cuenta?</p>
            <Button variant="ghost" size="lg" fullWidth onClick={() => navigate('/registro')}>
              Registra tu centro
            </Button>
          </div>

        </Card>
      </main>
    </div>
  );
}
