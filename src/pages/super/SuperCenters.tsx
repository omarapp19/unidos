import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Building2, Plus, Check, Trash2, Pencil, BadgeCheck, AtSign, Globe, Mail } from 'lucide-react';
import type { Center } from '@/types';
import {
  getPendingCenters,
  getApprovedCentersPage,
  approveCenter,
  setCenterVerified,
  deleteCenter,
  updateCenterAdmin,
  adminRegisterCenter,
  type CenterPatch,
} from '@/lib/api/centers';
import { toApiError, type ApiError } from '@/lib/api/errors';
import { forwardGeocode } from '@/lib/geo';
import { splitDial } from '@/lib/phone-codes';
import {
  EMPTY_BLOCK,
  isScheduleValid,
  parseSchedule,
  serializeSchedule,
  type ScheduleBlock,
} from '@/lib/schedule';
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
import { useQuery } from '@/lib/hooks/useQuery';
import { useMutation } from '@/lib/hooks/useMutation';
import {
  Button,
  Card,
  Modal,
  Input,
  Checkbox,
  QueryBoundary,
  EmptyState,
  CenterStatusBadge,
  VerifiedBadge,
} from '@/components/ui';
import { PhoneField, ScheduleField, EMPTY_PHONE, type PhoneValue } from '@/components/form';

/* ===========================================================================
   Panel de superadmin · gestión de centros: aprobar/rechazar pendientes,
   verificar, editar datos/coords y registrar centros huérfanos (sin admin).
   ========================================================================== */

/** Campos de texto del formulario (los estructurados van en estados aparte). */
type FormState = {
  name: string;
  organization: string;
  address: string;
  instagram: string;
  website: string;
  email: string;
};

type ErrorKey =
  | 'name'
  | 'organization'
  | 'address'
  | 'schedule'
  | 'phone'
  | 'instagram'
  | 'website'
  | 'email';
type Errors = Partial<Record<ErrorKey, string>>;

const EMPTY_FORM: FormState = {
  name: '', organization: '', address: '', instagram: '', website: '', email: '',
};

const PAGE_SIZE = 10;

/** Carga incremental (lazy) de centros aprobados: 10 al inicio, más al hacer scroll. */
function useApprovedCenters() {
  const [rows, setRows] = useState<Center[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);
  // Refs para leer estado actual sin recrear callbacks ni recargas en carrera.
  const runIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const lenRef = useRef(0);

  const load = useCallback(async (reset: boolean) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const runId = ++runIdRef.current;
    const offset = reset ? 0 : lenRef.current;
    setLoading(true);
    setError(null);
    try {
      const page = await getApprovedCentersPage(offset, PAGE_SIZE);
      if (runId !== runIdRef.current) return;
      setRows((prev) => {
        const next = reset ? page.rows : [...prev, ...page.rows];
        lenRef.current = next.length;
        return next;
      });
      setTotal(page.total);
      setLoadedOnce(true);
    } catch (err) {
      if (runId === runIdRef.current) setError(toApiError(err));
    } finally {
      // Solo la ejecución vigente limpia el estado; una obsoleta no toca nada
      // (el cleanup del efecto ya liberó inFlight para permitir la recarga).
      if (runId === runIdRef.current) {
        setLoading(false);
        inFlightRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    load(true);
    // Invalida la ejecución en curso y libera el cerrojo al desmontar/remontar
    // (StrictMode monta dos veces: sin esto la 2ª carga quedaría bloqueada).
    return () => {
      runIdRef.current++;
      inFlightRef.current = false;
    };
  }, [load]);

  const reload = useCallback(() => load(true), [load]);
  const loadMore = useCallback(() => load(false), [load]);
  const hasMore = !loadedOnce || rows.length < total;

  return { rows, total, loading, error, loadedOnce, hasMore, reload, loadMore };
}

export function SuperCenters() {
  const pendingQ = useQuery(getPendingCenters, []);
  const approvedList = useApprovedCenters();
  const approve = useMutation(approveCenter);
  const remove = useMutation(deleteCenter);
  const verify = useMutation((args: { id: string; value: boolean }) =>
    setCenterVerified(args.id, args.value),
  );
  const create = useMutation(adminRegisterCenter);
  const update = useMutation((args: { id: string; patch: CenterPatch }) =>
    updateCenterAdmin(args.id, args.patch),
  );

  // null = cerrado, 'new' = alta, Center = edición.
  const [editing, setEditing] = useState<Center | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [phone, setPhone] = useState<PhoneValue>(EMPTY_PHONE);
  const [schedule, setSchedule] = useState<ScheduleBlock[]>([{ ...EMPTY_BLOCK }]);
  const [scheduleLegacy, setScheduleLegacy] = useState<string | undefined>(undefined);
  const [hasWhatsApp, setHasWhatsApp] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const busy = create.loading || update.loading;

  const phoneValid = isValidPhoneNumber(phone.number);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /** Carga los estados estructurados (teléfono/horario/whatsapp) desde un centro. */
  function loadStructured(center?: Center) {
    if (!center) {
      setPhone(EMPTY_PHONE);
      setSchedule([{ ...EMPTY_BLOCK }]);
      setScheduleLegacy(undefined);
      setHasWhatsApp(false);
      return;
    }
    setPhone(center.phone ? { ...splitDial(center.phone) } : EMPTY_PHONE);
    const blocks = parseSchedule(center.schedule);
    if (blocks) {
      setSchedule(blocks);
      setScheduleLegacy(undefined);
    } else {
      setSchedule([{ ...EMPTY_BLOCK }]);
      setScheduleLegacy(center.schedule || undefined);
    }
    setHasWhatsApp(!!center.whatsapp);
  }

  function openNew() {
    setForm(EMPTY_FORM);
    loadStructured();
    setErrors({});
    setFormError(null);
    setEditing('new');
  }
  function openEdit(c: Center) {
    setForm({
      name: c.name, organization: c.organization, address: c.address,
      instagram: c.instagram ?? '', website: c.website ?? '', email: c.email ?? '',
    });
    loadStructured(c);
    setErrors({});
    setFormError(null);
    setEditing(c);
  }
  function close() {
    setEditing(null);
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!form.name.trim()) e.name = 'Ingresa el nombre.';
    if (!form.organization.trim()) e.organization = 'Indica la organización.';
    if (!form.address.trim()) e.address = 'Ingresa la dirección.';
    // Horario opcional, pero si se empezó a llenar debe quedar completo.
    const scheduleTouched = schedule.some(
      (b) => b.days.length > 0 || b.open !== '' || b.close !== '',
    );
    if (scheduleTouched && !isScheduleValid(schedule))
      e.schedule = 'Completa día, apertura y cierre en cada bloque.';
    if (phone.number.trim() && !phoneValid) e.phone = 'Número de teléfono no válido.';
    if (form.instagram.trim() && !isValidInstagram(form.instagram))
      e.instagram = 'Usuario de Instagram no válido.';
    if (form.website.trim() && !isValidUrl(normalizeUrl(form.website)))
      e.website = 'URL no válida (ej. https://centro.org).';
    if (form.email.trim() && !isValidEmail(form.email)) e.email = 'Correo no válido.';
    return e;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const scheduleStr = serializeSchedule(schedule);
    const phoneStr = phone.number.trim() ? formatPhone(phone.dial, phone.number) : '';
    const whatsappStr =
      hasWhatsApp && phoneValid ? toWhatsAppNumber(phone.dial, phone.number) : '';
    const instagram = form.instagram.trim() ? normalizeInstagram(form.instagram) : '';
    const website = form.website.trim() ? normalizeUrl(form.website) : '';

    try {
      const coords = await forwardGeocode(form.address);
      if (editing === 'new') {
        if (!coords) {
          setFormError('No se pudo ubicar la dirección. Revísala e intenta de nuevo.');
          return;
        }
        await create.mutate({
          name: form.name, organization: form.organization, address: form.address,
          schedule: scheduleStr, phone: phoneStr, whatsapp: whatsappStr,
          instagram, website, email: form.email,
          lat: coords.lat, lng: coords.lng, isApproved: true,
        });
      } else if (editing !== null) {
        const patch: CenterPatch = {
          name: form.name.trim(), organization: form.organization.trim(),
          address: form.address.trim(), schedule: scheduleStr,
          phone: phoneStr || null, whatsapp: whatsappStr || null,
          instagram: instagram || null, website: website || null,
          email: form.email.trim() || null,
        };
        // Re-geocodifica solo si la dirección cambió y se pudo ubicar.
        if (coords && form.address.trim() !== editing.address) {
          patch.lat = coords.lat;
          patch.lng = coords.lng;
        }
        await update.mutate({ id: editing.id, patch });
      }
      close();
      pendingQ.refetch();
      approvedList.reload();
    } catch {
      // El error ya queda en create.error / update.error; muestra genérico.
      setFormError('No se pudo guardar. Intenta de nuevo.');
    }
  }

  async function onApprove(id: string) {
    await approve.mutate(id);
    pendingQ.refetch();
    approvedList.reload();
  }
  async function onReject(id: string) {
    await remove.mutate(id);
    pendingQ.refetch();
  }
  async function onToggleVerified(c: Center) {
    await verify.mutate({ id: c.id, value: !c.is_verified });
    approvedList.reload();
  }

  const pending = pendingQ.data ?? [];
  const approved = approvedList.rows;

  // Scroll infinito dentro del contenedor con scroll propio: carga la siguiente
  // página al asomar el centinela (root = el contenedor, no el viewport).
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { hasMore, loadMore, loading: approvedLoading } = approvedList;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !approvedLoading) loadMore();
    }, { root: scrollRef.current, rootMargin: '200px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, approvedLoading, loadMore]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-h2 font-black text-ink">Centros</h1>
          <p className="font-body text-sm text-muted">
            Aprueba, verifica y mantén la red de centros de acopio.
          </p>
        </div>
        <Button onClick={openNew} leftIcon={<Plus className="h-4 w-4" />}>
          Registrar centro
        </Button>
      </header>

      {/* Pendientes */}
      <QueryBoundary
        loading={pendingQ.loading}
        error={pendingQ.error}
        onRetry={pendingQ.refetch}
        loadingLabel="Cargando pendientes…"
      >
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-h3 font-black text-ink">
            Pendientes ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" />}
              title="Sin centros pendientes"
              description="Cuando alguien registre un centro, aparecerá aquí para aprobarlo."
            />
          ) : (
            pending.map((c) => (
              <Card key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-display text-base font-black text-ink">{c.name}</p>
                  <p className="font-body text-sm text-muted">{c.organization} · {c.address}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onApprove(c.id)}
                    leftIcon={<Check className="h-4 w-4" />}>Aprobar</Button>
                  <Button size="sm" variant="ghost" onClick={() => onReject(c.id)}
                    leftIcon={<Trash2 className="h-4 w-4" />}>Rechazar</Button>
                </div>
              </Card>
            ))
          )}
        </section>
      </QueryBoundary>

      {/* Aprobados · carga incremental (10 por página) */}
      <section className="mt-6 flex flex-col gap-3">
        <h2 className="font-display text-h3 font-black text-ink">
          Aprobados ({approvedList.loadedOnce ? approvedList.total : '…'})
        </h2>
        <div
          ref={scrollRef}
          className="scrollbar-thin flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1"
        >
          {approved.map((c) => (
            <Card key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="font-display text-base font-black text-ink">{c.name}</p>
                  {c.is_verified && <VerifiedBadge variant="icon" />}
                  <CenterStatusBadge status={c.status} />
                </div>
                <p className="font-body text-sm text-muted">{c.organization} · {c.address}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={c.is_verified ? 'secondary' : 'primary'}
                  onClick={() => onToggleVerified(c)}
                  leftIcon={<BadgeCheck className="h-4 w-4" />}>
                  {c.is_verified ? 'Quitar sello' : 'Verificar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(c)}
                  leftIcon={<Pencil className="h-4 w-4" />}>Editar</Button>
              </div>
            </Card>
          ))}

          {approvedList.error && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-danger-line bg-danger-bg p-3">
              <p className="font-body text-sm text-danger-ink">No se pudieron cargar más centros.</p>
              <Button size="sm" variant="ghost" onClick={() => loadMore()}>Reintentar</Button>
            </div>
          )}

          {/* Centinela del scroll infinito + estado de carga */}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {approvedLoading && (
                <p className="font-body text-sm text-muted">Cargando centros…</p>
              )}
              {!approvedLoading && !approvedList.error && (
                <Button size="sm" variant="ghost" onClick={() => loadMore()}>
                  Cargar más
                </Button>
              )}
            </div>
          )}
        </div>

        {approvedList.loadedOnce && approvedList.total === 0 && (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="Sin centros aprobados"
            description="Aprueba un centro pendiente o registra uno nuevo."
          />
        )}
      </section>

      <Modal
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? 'Registrar centro' : 'Editar centro'}
        subtitle={editing === 'new'
          ? 'Centro huérfano: queda aprobado y visible al público.'
          : 'Corrige datos o coordenadas (re-geocodifica al cambiar la dirección).'}
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
          <Input label="Nombre" requiredMark placeholder="Liceo Andrés Bello"
            value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
          <Input label="Organización" requiredMark placeholder="Cruz Roja Venezolana"
            value={form.organization} onChange={(e) => set('organization', e.target.value)}
            error={errors.organization} />
          <Input label="Dirección" requiredMark placeholder="Av. Francisco de Miranda, Caracas"
            value={form.address} onChange={(e) => set('address', e.target.value)}
            error={errors.address} />

          <ScheduleField
            label="Horario de recepción"
            value={schedule}
            onChange={setSchedule}
            error={errors.schedule}
            legacyHint={scheduleLegacy}
          />

          <PhoneField label="Teléfono" value={phone} onChange={setPhone} error={errors.phone} />
          <Checkbox
            label="Este número tiene WhatsApp"
            hint={phoneValid ? undefined : 'Disponible cuando el teléfono sea válido.'}
            checked={hasWhatsApp}
            disabled={!phoneValid}
            onChange={(e) => setHasWhatsApp(e.target.checked)}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Instagram" placeholder="cruzroja_ve"
              leadingIcon={<AtSign className="h-4 w-4" aria-hidden />}
              value={form.instagram} onChange={(e) => set('instagram', e.target.value)}
              error={errors.instagram} />
            <Input label="Sitio web" placeholder="https://centro.org"
              leadingIcon={<Globe className="h-4 w-4" aria-hidden />}
              value={form.website} onChange={(e) => set('website', e.target.value)}
              error={errors.website} />
          </div>
          <Input label="Correo" type="email" placeholder="centro@organizacion.org"
            leadingIcon={<Mail className="h-4 w-4" aria-hidden />}
            value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />

          {formError && <p className="font-body text-sm text-danger-ink">{formError}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close} disabled={busy}>Cancelar</Button>
            <Button type="submit" loading={busy}>
              {editing === 'new' ? 'Registrar' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
