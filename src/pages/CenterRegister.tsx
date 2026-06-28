import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  ArrowLeft,
  ArrowRight,
  Building2,
  Landmark,
  Mail,
  Lock,
  AtSign,
  Globe,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button, Card, Input, Checkbox, AddressInput } from '@/components/ui';
import {
  PhoneField,
  ScheduleField,
  LocationField,
  EMPTY_PHONE,
  type PhoneValue,
} from '@/components/form';
import { cn } from '@/lib/utils';
import { useMutation } from '@/lib/hooks/useMutation';
import { registerCenter } from '@/lib/api/auth';
import { ClaimCenterFlow } from '@/pages/ClaimCenterFlow';
import { DEFAULT_LATLNG, reverseGeocodeAddress, type LatLng } from '@/lib/geo';
import { EMPTY_BLOCK, isScheduleValid, serializeSchedule, type ScheduleBlock } from '@/lib/schedule';
import {
  isValidEmail,
  isValidInstagram,
  isValidPhoneNumber,
  isValidUrl,
  formatPhone,
  normalizeInstagram,
  normalizeUrl,
  toWhatsAppNumber,
} from '@/lib/validation';

/* ===========================================================================
   Registro de un centro de acopio (PRD Módulo 2 · alta de cuenta) en 3 pasos:
     1. Datos del centro (obligatorio)   2. Cuenta y contacto (obligatorio)
     3. Redes y web (opcional, se pueden completar luego desde el panel).
   Crea la cuenta + el centro (is_approved=false, pendiente de aprobación) +
   el perfil del admin de forma atómica vía RPC `register_center`. La ubicación
   se elige con el mapa (o autocompletar la dirección).
   ========================================================================== */

type Fields = {
  name: string;
  organization: string;
  address: string;
  instagram: string;
  website: string;
  email: string;
  password: string;
  confirm: string;
};

type FieldKey = keyof Fields | 'phone' | 'schedule' | 'location';
type Errors = Partial<Record<FieldKey, string>>;

const EMPTY: Fields = {
  name: '',
  organization: '',
  address: '',
  instagram: '',
  website: '',
  email: '',
  password: '',
  confirm: '',
};

const STEPS = ['Tu centro', 'Cuenta y contacto', 'Redes y web'] as const;
const LAST_STEP = STEPS.length - 1;

export function CenterRegister() {
  const navigate = useNavigate();
  // 'new' = alta de un centro nuevo; 'claim' = reclamar uno existente sin admin.
  const [mode, setMode] = useState<'new' | 'claim'>('new');
  const [step, setStep] = useState(0);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [phone, setPhone] = useState<PhoneValue>(EMPTY_PHONE);
  const [schedule, setSchedule] = useState<ScheduleBlock[]>([{ ...EMPTY_BLOCK }]);
  const [hasWhatsApp, setHasWhatsApp] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);
  // true cuando el alta requiere confirmar el correo antes de crear el centro.
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const register = useMutation(registerCenter);
  const loading = register.loading;

  const [selectedCoords, setSelectedCoords] = useState<LatLng | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const phoneValid = isValidPhoneNumber(phone.number);

  function set<K extends keyof Fields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function handleAddressSelect(address: string, lat: number, lng: number) {
    set('address', address);
    setSelectedCoords({ lat, lng });
  }

  /** Click en el mapa: fija coords y reverse-geocodifica para rellenar dirección. */
  async function handleMapClick(lat: number, lng: number) {
    setSelectedCoords({ lat, lng });
    const resolved = await reverseGeocodeAddress({ lat, lng });
    if (resolved) set('address', resolved);
  }

  /** Valida solo los campos del paso indicado. */
  function validateStep(i: number): Errors {
    const e: Errors = {};
    if (i === 0) {
      // Obligatorios: organización, dirección y ubicación. El resto es opcional.
      if (!fields.organization.trim()) e.organization = 'Indica la organización autorizante.';
      if (!fields.address.trim()) e.address = 'Ingresa la dirección.';
      if (!selectedCoords) e.location = 'Selecciona la ubicación en el mapa.';
      // El horario es opcional, pero si se empezó a llenar debe quedar completo.
      const scheduleTouched = schedule.some(
        (b) => b.days.length > 0 || b.open !== '' || b.close !== '',
      );
      if (scheduleTouched && !isScheduleValid(schedule))
        e.schedule = 'Completa día, apertura y cierre, o deja el horario vacío.';
    } else if (i === 1) {
      // Teléfono opcional: solo valida formato si se escribió algo.
      if (phone.number.trim() && !phoneValid) e.phone = 'Número de teléfono no válido.';
      // Correo y contraseña son obligatorios: son las credenciales de la cuenta.
      if (!fields.email.trim()) e.email = 'Ingresa un correo de contacto.';
      else if (!isValidEmail(fields.email)) e.email = 'Correo no válido.';
      if (!fields.password) e.password = 'Crea una contraseña.';
      else if (fields.password.length < 8) e.password = 'Mínimo 8 caracteres.';
      if (fields.confirm !== fields.password) e.confirm = 'Las contraseñas no coinciden.';
    } else if (i === 2) {
      // Paso opcional: solo valida formato si el usuario escribió algo.
      if (fields.instagram.trim() && !isValidInstagram(fields.instagram))
        e.instagram = 'Usuario de Instagram no válido.';
      if (fields.website.trim() && !isValidUrl(normalizeUrl(fields.website)))
        e.website = 'Ingresa una URL válida (ej. https://tucentro.org).';
    }
    return e;
  }

  function goNext() {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setStep((s) => Math.min(s + 1, LAST_STEP));
  }

  function goBack() {
    setErrors({});
    setFormError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  /** Crea la cuenta. `skipSocials` ignora redes/web (se completan luego). */
  async function submit(skipSocials: boolean) {
    setFormError(null);
    const instagram = skipSocials ? '' : fields.instagram.trim();
    const website = skipSocials ? '' : fields.website.trim();

    if (!skipSocials) {
      const e = validateStep(2);
      setErrors(e);
      if (Object.keys(e).length > 0) return;
    }

    try {
      const coords = selectedCoords ?? DEFAULT_LATLNG;
      const result = await register.mutate({
        email: fields.email,
        password: fields.password,
        name: fields.name,
        organization: fields.organization,
        address: fields.address,
        schedule: serializeSchedule(schedule),
        phone: formatPhone(phone.dial, phone.number),
        whatsapp:
          hasWhatsApp && phoneValid ? toWhatsAppNumber(phone.dial, phone.number) : undefined,
        instagram: instagram ? normalizeInstagram(instagram) : undefined,
        website: website ? normalizeUrl(website) : undefined,
        lat: coords.lat,
        lng: coords.lng,
      });
      setNeedsEmailConfirm(!result.hasSession);
      setDone(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No pudimos crear la cuenta.');
    }
  }

  function onFormSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (step < LAST_STEP) goNext();
    else submit(false);
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
                Recibimos el registro de{' '}
                <strong className="text-ink">{fields.name || fields.organization}</strong>.
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
              <div className="mb-5 flex flex-col items-center text-center">
                <img
                  src="/logo-mark.png"
                  alt="Centros de Acopio Venezuela"
                  className="mb-3 h-20 w-20 object-contain"
                  width={80}
                  height={80}
                />
                <h1 className="font-display text-h2 font-black tracking-snug text-ink">
                  {mode === 'new' ? 'Registra tu centro de acopio' : 'Reclama tu centro'}
                </h1>
              </div>

              {/* Selector de modo: registrar nuevo o reclamar existente */}
              <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-lg bg-surface-2 p-1">
                {(['new', 'claim'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      'rounded-md px-3 py-2 font-body text-sm font-bold transition',
                      mode === m
                        ? 'bg-surface text-azul-ink shadow-sm'
                        : 'text-muted hover:text-ink',
                    )}
                  >
                    {m === 'new' ? 'Registrar centro nuevo' : 'Reclamar uno existente'}
                  </button>
                ))}
              </div>

              {mode === 'claim' ? (
                <ClaimCenterFlow />
              ) : (
              <>
              {/* Indicador de pasos */}
              <div className="mb-5">
                <div className="flex items-center justify-between">
                  {STEPS.map((label, i) => (
                    <span
                      key={label}
                      className={cn(
                        'font-body text-xs font-bold',
                        i === step ? 'text-azul-ink' : 'text-subtle',
                      )}
                    >
                      {label}
                      {i === LAST_STEP && (
                        <span className="font-normal text-muted"> (opcional)</span>
                      )}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-1.5">
                  {STEPS.map((label, i) => (
                    <span
                      key={label}
                      className={cn(
                        'h-1.5 flex-1 rounded-pill transition',
                        i <= step ? 'bg-azul' : 'bg-surface-3',
                      )}
                    />
                  ))}
                </div>
              </div>

              <form onSubmit={onFormSubmit} className="flex flex-col gap-4" noValidate>
                {/* ----- Paso 1: datos del centro ----- */}
                {step === 0 && (
                  <>
                    <Input
                      label="Nombre del centro (opcional)"
                      placeholder="Liceo Andrés Bello"
                      leadingIcon={<Building2 className="h-4 w-4" aria-hidden />}
                      value={fields.name}
                      onChange={(e) => set('name', e.target.value)}
                      error={errors.name}
                    />
                    <Input
                      label="Organización autorizante"
                      requiredMark
                      placeholder="Cruz Roja Venezolana"
                      leadingIcon={<Landmark className="h-4 w-4" aria-hidden />}
                      value={fields.organization}
                      onChange={(e) => set('organization', e.target.value)}
                      error={errors.organization}
                    />
                    <AddressInput
                      label="Dirección"
                      requiredMark
                      placeholder="Av. Francisco de Miranda, Chacao, Caracas"
                      leadingIcon={<MapPin className="h-4 w-4" aria-hidden />}
                      value={fields.address}
                      onChange={(e) => set('address', e.target.value)}
                      proximity={selectedCoords}
                      onSelect={handleAddressSelect}
                      error={errors.address}
                    />
                    <LocationField
                      required
                      lat={selectedCoords?.lat ?? null}
                      lng={selectedCoords?.lng ?? null}
                      onChange={handleMapClick}
                      error={errors.location}
                    />
                    <ScheduleField
                      label="Horario de recepción (opcional)"
                      value={schedule}
                      onChange={setSchedule}
                      error={errors.schedule}
                    />
                  </>
                )}

                {/* ----- Paso 2: cuenta y contacto ----- */}
                {step === 1 && (
                  <>
                    <PhoneField
                      label="Teléfono (opcional)"
                      value={phone}
                      onChange={setPhone}
                      error={errors.phone}
                    />
                    <Checkbox
                      label="Este número tiene WhatsApp"
                      hint={
                        phoneValid
                          ? 'Mostraremos un botón para escribir por WhatsApp.'
                          : 'Disponible cuando el teléfono sea válido.'
                      }
                      checked={hasWhatsApp}
                      disabled={!phoneValid}
                      onChange={(e) => setHasWhatsApp(e.target.checked)}
                    />
                    <Input
                      label="Correo de contacto"
                      requiredMark
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
                      requiredMark
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      leadingIcon={<Lock className="h-4 w-4" aria-hidden />}
                      trailingIcon={
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="rounded-full p-1.5 hover:bg-surface-2 transition text-muted hover:text-ink focus-visible:shadow-ring-azul focus-visible:outline-none"
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                      value={fields.password}
                      onChange={(e) => set('password', e.target.value)}
                      error={errors.password}
                      hint="Mínimo 8 caracteres."
                    />
                    <Input
                      label="Confirmar contraseña"
                      requiredMark
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      leadingIcon={<Lock className="h-4 w-4" aria-hidden />}
                      trailingIcon={
                        <button
                          type="button"
                          onClick={() => setShowConfirm((prev) => !prev)}
                          className="rounded-full p-1.5 hover:bg-surface-2 transition text-muted hover:text-ink focus-visible:shadow-ring-azul focus-visible:outline-none"
                          aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                      value={fields.confirm}
                      onChange={(e) => set('confirm', e.target.value)}
                      error={errors.confirm}
                    />
                  </>
                )}

                {/* ----- Paso 3: redes y web (opcional) ----- */}
                {step === 2 && (
                  <>
                    <p className="font-body text-sm text-body">
                      Estos datos son opcionales. Puedes omitirlos y completarlos luego desde tu
                      panel.
                    </p>
                    <Input
                      label="Instagram"
                      placeholder="cruzroja_ve"
                      leadingIcon={<AtSign className="h-4 w-4" aria-hidden />}
                      value={fields.instagram}
                      onChange={(e) => set('instagram', e.target.value)}
                      error={errors.instagram}
                    />
                    <Input
                      label="Sitio web"
                      placeholder="https://tucentro.org"
                      leadingIcon={<Globe className="h-4 w-4" aria-hidden />}
                      value={fields.website}
                      onChange={(e) => set('website', e.target.value)}
                      error={errors.website}
                    />
                  </>
                )}

                {formError && (
                  <p className="font-body text-sm font-semibold text-danger-ink">{formError}</p>
                )}

                {/* ----- Navegación ----- */}
                <div className="mt-1 flex gap-2">
                  {step > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="lg"
                      onClick={goBack}
                      disabled={loading}
                      leftIcon={<ArrowLeft className="h-4 w-4" />}
                    >
                      Atrás
                    </Button>
                  )}
                  {step < LAST_STEP ? (
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      Continuar
                    </Button>
                  ) : (
                    <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                      Crear cuenta del centro
                    </Button>
                  )}
                </div>
              </form>
              </>
              )}

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
