import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { PhoneField, EMPTY_PHONE, type PhoneValue } from '@/components/form';
import { cn } from '@/lib/utils';
import { useQuery } from '@/lib/hooks/useQuery';
import { useMutation } from '@/lib/hooks/useMutation';
import { listOrphanCenters, claimExistingCenter } from '@/lib/api/claims';
import type { OrphanCenter } from '@/types';
import {
  isValidEmail,
  isValidPhoneNumber,
  formatPhone,
} from '@/lib/validation';

/* ===========================================================================
   Reclamo de un centro existente (mecanismo A). Un usuario nuevo busca un
   centro aprobado SIN administrador, crea su cuenta y envía una solicitud con
   pruebas de su vínculo. Queda pendiente de aprobación del superadmin (anti-
   fraude); no entra al panel hasta que lo aprueben.
   ========================================================================== */

export function ClaimCenterFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Paso 0: selección del centro.
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const orphansQ = useQuery(() => listOrphanCenters(debounced), [debounced]);
  const [selected, setSelected] = useState<OrphanCenter | null>(null);

  // Paso 1: cuenta + prueba de vínculo.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [evidence, setEvidence] = useState('');
  const [phone, setPhone] = useState<PhoneValue>(EMPTY_PHONE);
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const claim = useMutation(claimExistingCenter);
  const phoneValid = isValidPhoneNumber(phone.number);

  function goSelect(c: OrphanCenter) {
    setSelected(c);
    setStep(1);
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Ingresa tu nombre completo.';
    if (!evidence.trim())
      e.evidence = 'Describe tu vínculo con el centro (cargo, cómo te conocen, etc.).';
    if (!email.trim()) e.email = 'Ingresa un correo.';
    else if (!isValidEmail(email)) e.email = 'Correo no válido.';
    if (!password) e.password = 'Crea una contraseña.';
    else if (password.length < 8) e.password = 'Mínimo 8 caracteres.';
    if (confirm !== password) e.confirm = 'Las contraseñas no coinciden.';
    if (phone.number.trim() && !phoneValid) e.phone = 'Número de teléfono no válido.';
    return e;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0 || !selected) return;
    try {
      await claim.mutate({
        email,
        password,
        centerId: selected.id,
        fullName,
        claimantRole: role,
        evidence,
        contactPhone: phone.number.trim()
          ? formatPhone(phone.dial, phone.number)
          : undefined,
      });
      setDone(true);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'No pudimos enviar tu solicitud.',
      );
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-success/15 text-success-ink">
          <CheckCircle2 className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="font-display text-h2 font-black tracking-snug text-ink">
          Solicitud enviada
        </h1>
        <p className="mt-2 max-w-sm font-body text-sm text-body">
          Pediste administrar{' '}
          <strong className="text-ink">
            {selected?.name || selected?.organization}
          </strong>
          . Un coordinador verificará tu vínculo con el centro y, al aprobarlo,
          podrás iniciar sesión para gestionarlo.
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
    );
  }

  // ----- Paso 0: elegir el centro -----
  if (step === 0) {
    const orphans = orphansQ.data ?? [];
    return (
      <div className="flex flex-col gap-4">
        <p className="font-body text-sm text-body">
          Busca el centro que ya aparece en el mapa y del que eres responsable.
        </p>
        <Input
          placeholder="Buscar por nombre, organización o dirección…"
          leadingIcon={<Search className="h-4 w-4" aria-hidden />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {orphansQ.loading ? (
          <p className="py-4 text-center font-body text-sm text-muted">Buscando…</p>
        ) : orphans.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-surface-2 p-6 text-center">
            <Building2 className="h-6 w-6 text-muted" aria-hidden />
            <p className="font-body text-sm text-body">
              {debounced.trim()
                ? 'Ningún centro sin administrador coincide con tu búsqueda.'
                : 'No hay centros disponibles para reclamar ahora mismo.'}
            </p>
            <p className="font-body text-xs text-muted">
              ¿No encuentras el tuyo? Regístralo como centro nuevo.
            </p>
          </div>
        ) : (
          <div className="scrollbar-thin flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
            {orphans.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => goSelect(c)}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3 text-left transition hover:border-azul hover:bg-surface-2 focus-visible:shadow-ring-azul focus-visible:outline-none"
              >
                <span className="flex flex-col">
                  <span className="font-display text-sm font-black text-ink">
                    {c.name || c.organization}
                  </span>
                  <span className="font-body text-xs text-muted">
                    {c.organization} · {c.address}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ----- Paso 1: cuenta + prueba de vínculo -----
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 p-3">
        <div className="flex flex-col">
          <span className="font-display text-sm font-black text-ink">
            {selected?.name || selected?.organization}
          </span>
          <span className="font-body text-xs text-muted">{selected?.address}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep(0)}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Cambiar
        </Button>
      </div>

      <Input
        label="Tu nombre completo"
        requiredMark
        leadingIcon={<User className="h-4 w-4" aria-hidden />}
        placeholder="María Pérez"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={errors.fullName}
      />
      <Input
        label="Tu cargo en el centro"
        placeholder="Coordinadora, voluntario, encargado…"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-sm font-semibold text-ink">
          ¿Cómo estás ligado al centro? <span className="text-danger-ink">*</span>
        </label>
        <textarea
          rows={3}
          className={cn(
            'w-full rounded-lg border bg-surface px-3 py-2 font-body text-sm text-ink shadow-sm transition placeholder:text-subtle focus-visible:shadow-ring-azul focus-visible:outline-none',
            errors.evidence ? 'border-danger-line' : 'border-line',
          )}
          placeholder="Ej. Soy la coordinadora desde 2023; pueden confirmarlo con la organización autorizante al teléfono…"
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
        />
        {errors.evidence && (
          <p className="font-body text-xs text-danger-ink">{errors.evidence}</p>
        )}
      </div>

      <PhoneField
        label="Teléfono de contacto (opcional)"
        value={phone}
        onChange={setPhone}
        error={errors.phone}
      />

      <Input
        label="Correo"
        requiredMark
        type="email"
        autoComplete="email"
        leadingIcon={<Mail className="h-4 w-4" aria-hidden />}
        placeholder="tu@correo.org"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
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
            onClick={() => setShowPassword((p) => !p)}
            className="rounded-full p-1.5 hover:bg-surface-2 transition text-muted hover:text-ink focus-visible:shadow-ring-azul focus-visible:outline-none"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
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
        error={errors.confirm}
      />

      {formError && (
        <p className="font-body text-sm font-semibold text-danger-ink">{formError}</p>
      )}

      <Button type="submit" variant="primary" size="lg" fullWidth loading={claim.loading}>
        Enviar solicitud de reclamo
      </Button>
    </form>
  );
}
