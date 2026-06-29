import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Building2, Plus, Check, Trash2, Pencil, BadgeCheck, AtSign, Globe, Mail, Search, ShieldCheck, UserCheck, UserPlus, Send } from 'lucide-react';
import type { Center, CenterAdminStatus } from '@/types';
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
import {
  getCenterClaims,
  approveCenterClaim,
  rejectCenterClaim,
  notifyClaimApproved,
} from '@/lib/api/claims';
import type { CenterClaim } from '@/types';
import {
  getCenterAdminStatus,
  inviteCenterAdmin,
} from '@/lib/api/invitations';
import { toApiError, type ApiError } from '@/lib/api/errors';
import { forwardGeocode, reverseGeocodeAddress } from '@/lib/geo';
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
  AddressInput,
  Select,
  Checkbox,
  QueryBoundary,
  EmptyState,
  CenterStatusBadge,
  VerifiedBadge,
} from '@/components/ui';
import {
  PhoneField,
  ScheduleField,
  LocationField,
  EMPTY_PHONE,
  type PhoneValue,
} from '@/components/form';

/* ===========================================================================
   Panel de superadmin · gestión de centros: aprobar/rechazar pendientes,
   verificar, editar datos/coords y registrar centros huérfanos (sin admin).
   ========================================================================== */

/** Campos de texto del formulario (los estructurados van en estados aparte). */
type FormState = {
  name: string;
  organization: string;
  address: string;
  state: string;
  country: string;
  instagram: string;
  website: string;
  email: string;
  status: Center['status'];
  lat: string;
  lng: string;
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
  name: '', organization: '', address: '', state: '', country: 'Venezuela',
  instagram: '', website: '', email: '',
  status: 'receiving',
  lat: '',
  lng: '',
};

const STATUS_OPTIONS = [
  { value: 'receiving', label: 'Abierto (Recibiendo donaciones)' },
  { value: 'full', label: 'Lleno (Capacidad máxima)' },
  { value: 'closed', label: 'Cerrado' },
];

const PAGE_SIZE = 10;

/** Carga incremental (lazy) de centros aprobados: 10 al inicio, más al hacer scroll. */
function useApprovedCenters(verifiedOnly: boolean, search: string) {
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
    // Un loadMore se descarta si ya hay petición en curso; un reset (carga
    // inicial o cambio de filtro) siempre procede e invalida lo anterior.
    if (inFlightRef.current && !reset) return;
    inFlightRef.current = true;
    const runId = ++runIdRef.current;
    if (reset) {
      // Limpia de inmediato para que no queden filas obsoletas visibles aunque
      // el resolve de esta petición pierda la carrera de runId.
      lenRef.current = 0;
      setRows([]);
    }
    const offset = reset ? 0 : lenRef.current;
    setLoading(true);
    setError(null);
    try {
      const page = await getApprovedCentersPage(offset, PAGE_SIZE, verifiedOnly, search);
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
  }, [verifiedOnly, search]);

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
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Debounce para no disparar una consulta por tecla en los aprobados (servidor).
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  const pendingQ = useQuery(getPendingCenters, []);
  const approvedList = useApprovedCenters(verifiedOnly, debouncedSearch);
  const approve = useMutation(approveCenter);
  const remove = useMutation(deleteCenter);
  const verify = useMutation((args: { id: string; value: boolean }) =>
    setCenterVerified(args.id, args.value),
  );
  const create = useMutation(adminRegisterCenter);
  const update = useMutation((args: { id: string; patch: CenterPatch }) =>
    updateCenterAdmin(args.id, args.patch),
  );
  // Solicitudes de reclamo de centros huérfanos (mecanismo A).
  const claimsQ = useQuery(getCenterClaims, []);
  const approveClaim = useMutation(approveCenterClaim);
  const rejectClaim = useMutation(rejectCenterClaim);

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

  // Administrador del centro en edición (mecanismo B: invitación por correo).
  const [adminStatus, setAdminStatus] = useState<CenterAdminStatus | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteInfo, setInviteInfo] = useState<string | null>(null);
  const invite = useMutation((args: { centerId: string; email: string }) =>
    inviteCenterAdmin(args.centerId, args.email),
  );

  const phoneValid = isValidPhoneNumber(phone.number);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const handleMapClick = useCallback(async (latitude: number, longitude: number) => {
    setForm((f) => ({
      ...f,
      lat: latitude.toFixed(6),
      lng: longitude.toFixed(6),
    }));
    try {
      const resolvedAddress = await reverseGeocodeAddress({ lat: latitude, lng: longitude });
      if (resolvedAddress) {
        setForm((f) => ({
          ...f,
          address: resolvedAddress,
        }));
      }
    } catch (err) {
      console.error('Error al resolver la dirección:', err);
    }
  }, []);

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

  function resetAdminSection() {
    setAdminStatus(null);
    setInviteEmail('');
    setInviteInfo(null);
    invite.reset();
  }

  function openNew() {
    setForm(EMPTY_FORM);
    loadStructured();
    setErrors({});
    setFormError(null);
    resetAdminSection();
    setEditing('new');
  }
  const close = useCallback(() => {
    setEditing(null);
  }, []);
  function openEdit(c: Center) {
    setForm({
      name: c.name, organization: c.organization, address: c.address,
      state: c.state ?? '', country: c.country ?? 'Venezuela',
      instagram: c.instagram ?? '', website: c.website ?? '', email: c.email ?? '',
      status: c.status,
      lat: String(c.lat),
      lng: String(c.lng),
    });
    loadStructured(c);
    setErrors({});
    setFormError(null);
    resetAdminSection();
    setInviteEmail(c.email ?? '');
    setEditing(c);
    // Carga el estado del admin (tiene admin / invitación pendiente).
    getCenterAdminStatus(c.id)
      .then(setAdminStatus)
      .catch(() => setAdminStatus(null));
  }

  async function onSendInvite(centerId: string) {
    setInviteInfo(null);
    try {
      const res = await invite.mutate({ centerId, email: inviteEmail });
      const status = await getCenterAdminStatus(centerId);
      setAdminStatus(status);
      setInviteInfo(
        res.alreadyRegistered
          ? 'Ese correo ya tenía cuenta: le enviamos un enlace para entrar y aceptar.'
          : 'Invitación enviada por correo.',
      );
    } catch {
      // El error queda en invite.error; se muestra abajo.
    }
  }

  async function onApproveClaim(cl: CenterClaim) {
    await approveClaim.mutate(cl.id);
    // Avisa al nuevo admin por correo (best-effort; no bloquea si no hay proveedor).
    void notifyClaimApproved(cl.claimant_email, cl.center_name || cl.center_organization);
    claimsQ.refetch();
    approvedList.reload();
  }
  async function onRejectClaim(claimId: string) {
    await rejectClaim.mutate(claimId);
    claimsQ.refetch();
  }

  function validate(): Errors {
    const e: Errors = {};
    // Solo obligatorios: organización y dirección (consistente con los otros forms).
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

    const latVal = parseFloat(form.lat);
    const lngVal = parseFloat(form.lng);
    const hasValidCoords = !isNaN(latVal) && !isNaN(lngVal);

    try {
      let finalLat = hasValidCoords ? latVal : 0;
      let finalLng = hasValidCoords ? lngVal : 0;

      // Geocodifica solo si no hay coordenadas válidas, o si se cambió la dirección sin modificar las coordenadas
      const addressChanged = editing !== 'new' && editing !== null && form.address.trim() !== editing.address;
      const coordsUntouched = editing !== 'new' && editing !== null && form.lat === String(editing.lat) && form.lng === String(editing.lng);

      if (!hasValidCoords || (addressChanged && coordsUntouched)) {
        const coords = await forwardGeocode(form.address);
        if (coords) {
          finalLat = coords.lat;
          finalLng = coords.lng;
        } else if (!hasValidCoords) {
          setFormError('No se pudo ubicar la dirección automáticamente. Por favor, ingresa Latitud y Longitud manualmente.');
          return;
        }
      }

      if (editing === 'new') {
        const newId = await create.mutate({
          name: form.name, organization: form.organization, address: form.address,
          schedule: scheduleStr, phone: phoneStr, whatsapp: whatsappStr,
          instagram, website, email: form.email,
          lat: finalLat, lng: finalLng, isApproved: true,
        });
        const newPatch: CenterPatch = {};
        if (form.status !== 'receiving') newPatch.status = form.status;
        if (form.state.trim()) newPatch.state = form.state.trim();
        if (form.country.trim() && form.country.trim() !== 'Venezuela')
          newPatch.country = form.country.trim();
        if (Object.keys(newPatch).length > 0) {
          await updateCenterAdmin(newId, newPatch);
        }
      } else if (editing !== null) {
        const patch: CenterPatch = {
          name: form.name.trim(), organization: form.organization.trim(),
          address: form.address.trim(),
          state: form.state.trim() || null, country: form.country.trim() || 'Venezuela',
          schedule: scheduleStr,
          phone: phoneStr || null, whatsapp: whatsappStr || null,
          instagram: instagram || null, website: website || null,
          email: form.email.trim() || null,
          status: form.status,
          lat: finalLat,
          lng: finalLng,
        };
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
  async function onDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar permanentemente este centro de acopio? Se borrará todo su historial.')) return;
    try {
      await remove.mutate(id);
      approvedList.reload();
    } catch {
      alert('No se pudo eliminar el centro de acopio.');
    }
  }
  async function onToggleVerified(c: Center) {
    await verify.mutate({ id: c.id, value: !c.is_verified });
    approvedList.reload();
  }

  const pending = pendingQ.data ?? [];
  const approved = approvedList.rows;

  const filteredPending = pending.filter((c) =>
    [c.name, c.organization, c.address, c.email].some((field) =>
      (field ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Render incremental de pendientes: 10 al inicio, +10 al asomar el centinela.
  const PENDING_PAGE = 10;
  const [pendingVisible, setPendingVisible] = useState(PENDING_PAGE);
  useEffect(() => {
    setPendingVisible(PENDING_PAGE);
  }, [searchQuery]);
  const visiblePending = filteredPending.slice(0, pendingVisible);
  const pendingScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingSentinelRef = useRef<HTMLDivElement | null>(null);
  const pendingHasMore = pendingVisible < filteredPending.length;
  useEffect(() => {
    const node = pendingSentinelRef.current;
    if (!node || !pendingHasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setPendingVisible((v) => v + PENDING_PAGE);
      }
    }, { root: pendingScrollRef.current, rootMargin: '200px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [pendingHasMore]);

  // Los aprobados ya vienen filtrados por el servidor (búsqueda + verificados).
  const filteredApproved = approved;

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

      {/* Buscador */}
      <div className="w-full max-w-md">
        <Input
          placeholder="Buscar por nombre, organización o dirección…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leadingIcon={<Search className="h-4 w-4" aria-hidden />}
        />
      </div>

      {/* Pendientes */}
      <QueryBoundary
        loading={pendingQ.loading}
        error={pendingQ.error}
        onRetry={pendingQ.refetch}
        loadingLabel="Cargando pendientes…"
      >
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-h3 font-black text-ink">
            Pendientes ({filteredPending.length})
          </h2>
          {pending.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" />}
              title="Sin centros pendientes"
              description="Cuando alguien registre un centro, aparecerá aquí para aprobarlo."
            />
          ) : filteredPending.length === 0 ? (
            <p className="text-xs text-muted font-body">No se encontraron centros pendientes que coincidan con la búsqueda.</p>
          ) : (
            <div
              ref={pendingScrollRef}
              className="scrollbar-thin flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1"
            >
              {visiblePending.map((c) => (
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
              ))}
              {pendingHasMore && <div ref={pendingSentinelRef} className="h-px" />}
            </div>
          )}
        </section>
      </QueryBoundary>

      {/* Solicitudes de reclamo de centros huérfanos */}
      <QueryBoundary
        loading={claimsQ.loading}
        error={claimsQ.error}
        onRetry={claimsQ.refetch}
        loadingLabel="Cargando solicitudes…"
      >
        {(claimsQ.data ?? []).length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-h3 font-black text-ink">
              Solicitudes de reclamo ({(claimsQ.data ?? []).length})
            </h2>
            <p className="-mt-1 font-body text-xs text-muted">
              Verifica que la persona esté ligada al centro antes de aprobar.
            </p>
            <div className="scrollbar-thin flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
              {(claimsQ.data ?? []).map((cl) => (
                <Card key={cl.id} className="flex flex-col gap-3 p-4">
                  <div className="flex flex-col gap-1">
                    <p className="font-display text-base font-black text-ink">
                      {cl.center_name || cl.center_organization}
                    </p>
                    <p className="font-body text-sm text-muted">
                      {cl.center_organization} · {cl.center_address}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-2 p-3 text-sm">
                    <p className="font-body text-ink">
                      <span className="font-semibold">{cl.full_name}</span>
                      {cl.claimant_role ? ` — ${cl.claimant_role}` : ''}
                    </p>
                    <p className="font-body text-muted">{cl.claimant_email}</p>
                    {cl.contact_phone && (
                      <p className="font-body text-muted">Tel: {cl.contact_phone}</p>
                    )}
                    {cl.evidence && (
                      <p className="mt-1 font-body text-body">“{cl.evidence}”</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => onApproveClaim(cl)}
                      leftIcon={<UserCheck className="h-4 w-4" />}>
                      Aprobar y asignar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onRejectClaim(cl.id)}
                      leftIcon={<Trash2 className="h-4 w-4" />}>
                      Rechazar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </QueryBoundary>

      {/* Aprobados · carga incremental (10 por página) */}
      <section className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-h3 font-black text-ink">
            Aprobados ({approvedList.loadedOnce ? approvedList.total : '…'})
          </h2>
          <Button
            size="sm"
            variant={verifiedOnly ? 'primary' : 'secondary'}
            onClick={() => setVerifiedOnly((v) => !v)}
            leftIcon={<ShieldCheck className="h-4 w-4" />}
          >
            {verifiedOnly ? 'Mostrar todos' : 'Solo verificados'}
          </Button>
        </div>
        <div
          ref={scrollRef}
          className="scrollbar-thin flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1"
        >
          {filteredApproved.map((c) => (
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
                <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-bg hover:text-danger-ink" onClick={() => onDelete(c.id)}
                  leftIcon={<Trash2 className="h-4 w-4" />}>Eliminar</Button>
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
          debouncedSearch.trim() || verifiedOnly ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" />}
              title="Sin resultados"
              description="Ningún centro aprobado coincide con la búsqueda o el filtro."
            />
          ) : (
            <EmptyState
              icon={<Building2 className="h-6 w-6" />}
              title="Sin centros aprobados"
              description="Aprueba un centro pendiente o registra uno nuevo."
            />
          )
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
          <Input label="Nombre (opcional)" placeholder="Liceo Andrés Bello"
            value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
          <Input label="Organización" requiredMark placeholder="Cruz Roja Venezolana"
            value={form.organization} onChange={(e) => set('organization', e.target.value)}
            error={errors.organization} />
          <AddressInput
            label="Dirección"
            requiredMark
            placeholder="Av. Francisco de Miranda, Caracas"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            proximity={form.lat && form.lng ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) } : null}
            onSelect={(address, lat, lng) => {
              setForm((f) => ({
                ...f,
                address,
                lat: lat.toFixed(6),
                lng: lng.toFixed(6),
              }));
            }}
            error={errors.address}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Estado / Provincia (opcional)" placeholder="Zulia"
              value={form.state} onChange={(e) => set('state', e.target.value)}
              hint="Usado por el filtro público por estado/país." />
            <Input label="País" placeholder="Venezuela"
              value={form.country} onChange={(e) => set('country', e.target.value)} />
          </div>

          <LocationField
            lat={form.lat ? parseFloat(form.lat) : null}
            lng={form.lng ? parseFloat(form.lng) : null}
            onChange={handleMapClick}
            hint="Haz clic en el mapa para situar el marcador. Actualiza coordenadas y dirección automáticamente. Si lo dejas vacío, se geocodifica desde la dirección."
          />

          <Select
            label="Estado del centro"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(val) => set('status', val as any)}
          />

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

          {/* Administrador del centro (solo en edición) */}
          {editing !== 'new' && editing !== null && (
            <div className="mt-1 flex flex-col gap-2 rounded-lg border border-line bg-surface-2 p-3">
              <p className="flex items-center gap-2 font-display text-sm font-black text-ink">
                <UserPlus className="h-4 w-4" aria-hidden />
                Administrador
              </p>
              {adminStatus?.has_admin ? (
                <p className="font-body text-sm text-body">
                  Asignado a <span className="font-semibold text-ink">{adminStatus.admin_email}</span>.
                </p>
              ) : adminStatus?.pending_invitation_email ? (
                <div className="flex flex-col gap-2">
                  <p className="font-body text-sm text-body">
                    Invitación pendiente para{' '}
                    <span className="font-semibold text-ink">{adminStatus.pending_invitation_email}</span>.
                  </p>
                  <div className="flex items-end gap-2">
                    <Input
                      label="Reenviar a otro correo"
                      type="email"
                      placeholder="responsable@centro.org"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="button" variant="secondary" loading={invite.loading}
                      disabled={!inviteEmail.trim()}
                      onClick={() => onSendInvite(editing.id)}
                      leftIcon={<Send className="h-4 w-4" />}>
                      Reenviar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="font-body text-sm text-muted">
                    Centro sin administrador. Invita por correo a la persona responsable.
                  </p>
                  <div className="flex items-end gap-2">
                    <Input
                      label="Correo del responsable"
                      type="email"
                      placeholder="responsable@centro.org"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="button" loading={invite.loading}
                      disabled={!inviteEmail.trim()}
                      onClick={() => onSendInvite(editing.id)}
                      leftIcon={<Send className="h-4 w-4" />}>
                      Invitar
                    </Button>
                  </div>
                </div>
              )}
              {inviteInfo && (
                <p className="font-body text-sm font-semibold text-success-ink">{inviteInfo}</p>
              )}
              {invite.error && (
                <p className="font-body text-sm text-danger-ink">{invite.error.message}</p>
              )}
            </div>
          )}

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
