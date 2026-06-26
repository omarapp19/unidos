import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  ArrowLeft,
  Building2,
  Landmark,
  Mail,
  Lock,
  Phone,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Button, Card, Input } from '@/components/ui';
import { useMutation } from '@/lib/hooks/useMutation';
import { registerCenter } from '@/lib/api/auth';
import { forwardGeocode, DEFAULT_LATLNG } from '@/lib/geo';

/* ===========================================================================
   Registro de un centro de acopio (PRD Módulo 2 · alta de cuenta).
   Geocodifica la dirección (OSM), crea la cuenta (Supabase Auth) y el centro
   (is_approved=false) + perfil del admin de forma atómica vía RPC
   `register_center`. Si el proyecto exige confirmar el correo, informa que debe
   revisar su bandeja antes de continuar.
   ========================================================================== */

type Fields = {
  name: string;
  organization: string;
  address: string;
  schedule: string;
  phone: string;
  email: string;
  password: string;
  confirm: string;
};

type Errors = Partial<Record<keyof Fields, string>>;

const EMPTY: Fields = {
  name: '',
  organization: '',
  address: '',
  schedule: '',
  phone: '',
  email: '',
  password: '',
  confirm: '',
};

export function CenterRegister() {
  const navigate = useNavigate();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);
  // true cuando el alta requiere confirmar el correo antes de crear el centro.
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const register = useMutation(registerCenter);
  const loading = register.loading;

  function set<K extends keyof Fields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!fields.name.trim()) e.name = 'Ingresa el nombre del centro.';
    if (!fields.organization.trim()) e.organization = 'Indica la organización autorizante.';
    if (!fields.address.trim()) e.address = 'Ingresa la dirección.';
    if (!fields.schedule.trim()) e.schedule = 'Indica el horario de recepción.';
    if (!fields.email.trim()) e.email = 'Ingresa un correo de contacto.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()))
      e.email = 'Correo no válido.';
    if (!fields.password) e.password = 'Crea una contraseña.';
    else if (fields.password.length < 6) e.password = 'Mínimo 6 caracteres.';
    if (fields.confirm !== fields.password) e.confirm = 'Las contraseñas no coinciden.';
    return e;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    try {
      // Geocodifica la dirección para ubicar el centro en el mapa. Si falla,
      // usa un respaldo (un coordinador puede ajustar la posición al aprobar).
      const coords = (await forwardGeocode(fields.address)) ?? DEFAULT_LATLNG;
      const result = await register.mutate({
        email: fields.email,
        password: fields.password,
        name: fields.name,
        organization: fields.organization,
        address: fields.address,
        schedule: fields.schedule,
        phone: fields.phone,
        lat: coords.lat,
        lng: coords.lng,
      });
      setNeedsEmailConfirm(!result.hasSession);
      setDone(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No pudimos crear la cuenta.');
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
        <Card className="w-full max-w-lg">
          {done ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-success/15 text-success-ink">
                <CheckCircle2 className="h-6 w-6" aria-hidden />
              </span>
              <h1 className="font-display text-h2 font-black tracking-snug text-ink">
                Solicitud enviada
              </h1>
              <p className="mt-2 max-w-sm font-body text-sm text-body">
                Recibimos el registro de <strong className="text-ink">{fields.name}</strong>.
                {needsEmailConfirm
                  ? ' Revisa tu correo para confirmar la cuenta; luego inicia sesión para completar el alta de tu centro.'
                  : ' Una organización autorizante revisará los datos y, al aprobarlos, tu centro aparecerá en el mapa público.'}
              </p>
              <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
                <Button variant="primary" size="lg" onClick={() => navigate('/admin/login')}>
                  Ir a iniciar sesión
                </Button>
                <Button variant="ghost" size="lg" onClick={() => navigate('/')}>
                  Volver al mapa
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col items-center text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-rojo text-white">
                  <MapPin className="h-6 w-6" aria-hidden />
                </span>
                <h1 className="font-display text-h2 font-black tracking-snug text-ink">
                  Registra tu centro de acopio
                </h1>
                <p className="mt-1 font-body text-sm text-body">
                  Completa los datos obligatorios. Tu centro se publicará tras la aprobación.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <Input
                  label="Nombre del centro"
                  placeholder="Liceo Andrés Bello"
                  leadingIcon={<Building2 className="h-4 w-4" aria-hidden />}
                  value={fields.name}
                  onChange={(e) => set('name', e.target.value)}
                  error={errors.name}
                />
                <Input
                  label="Organización autorizante"
                  placeholder="Cruz Roja Venezolana"
                  leadingIcon={<Landmark className="h-4 w-4" aria-hidden />}
                  value={fields.organization}
                  onChange={(e) => set('organization', e.target.value)}
                  error={errors.organization}
                />
                <Input
                  label="Dirección"
                  placeholder="Av. Francisco de Miranda, Chacao, Caracas"
                  leadingIcon={<MapPin className="h-4 w-4" aria-hidden />}
                  value={fields.address}
                  onChange={(e) => set('address', e.target.value)}
                  error={errors.address}
                />
                <Input
                  label="Horario de recepción"
                  placeholder="Lun a Dom · 8:00 a.m. – 6:00 p.m."
                  leadingIcon={<Clock className="h-4 w-4" aria-hidden />}
                  value={fields.schedule}
                  onChange={(e) => set('schedule', e.target.value)}
                  error={errors.schedule}
                />
                <Input
                  label="Teléfono (opcional)"
                  type="tel"
                  placeholder="+58 412 000 0000"
                  leadingIcon={<Phone className="h-4 w-4" aria-hidden />}
                  value={fields.phone}
                  onChange={(e) => set('phone', e.target.value)}
                />

                <div className="my-1 border-t border-line-soft" />

                <Input
                  label="Correo de contacto"
                  type="email"
                  autoComplete="email"
                  placeholder="centro@organizacion.org"
                  leadingIcon={<Mail className="h-4 w-4" aria-hidden />}
                  value={fields.email}
                  onChange={(e) => set('email', e.target.value)}
                  error={errors.email}
                />
                <Input
                  label="Contraseña"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  leadingIcon={<Lock className="h-4 w-4" aria-hidden />}
                  value={fields.password}
                  onChange={(e) => set('password', e.target.value)}
                  error={errors.password}
                  hint="Mínimo 6 caracteres."
                />
                <Input
                  label="Confirmar contraseña"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  leadingIcon={<Lock className="h-4 w-4" aria-hidden />}
                  value={fields.confirm}
                  onChange={(e) => set('confirm', e.target.value)}
                  error={errors.confirm}
                />

                {formError && (
                  <p className="font-body text-sm font-semibold text-danger-ink">{formError}</p>
                )}

                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                  Crear cuenta del centro
                </Button>
              </form>

              <p className="mt-5 text-center font-body text-xs text-muted">
                ¿Ya tienes cuenta?{' '}
                <Link to="/admin/login" className="font-semibold text-azul-ink hover:underline">
                  Inicia sesión
                </Link>
              </p>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
