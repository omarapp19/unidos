import { useState, type FormEvent } from 'react';
import { Building2, Plus, Check, Trash2, Pencil, BadgeCheck } from 'lucide-react';
import type { Center } from '@/types';
import {
  getAllCenters,
  approveCenter,
  setCenterVerified,
  deleteCenter,
  updateCenterAdmin,
  adminRegisterCenter,
  type CenterPatch,
} from '@/lib/api/centers';
import { forwardGeocode } from '@/lib/geo';
import { useQuery } from '@/lib/hooks/useQuery';
import { useMutation } from '@/lib/hooks/useMutation';
import {
  Button,
  Card,
  Modal,
  Input,
  QueryBoundary,
  EmptyState,
  CenterStatusBadge,
  VerifiedBadge,
} from '@/components/ui';

/* ===========================================================================
   Panel de superadmin · gestión de centros: aprobar/rechazar pendientes,
   verificar, editar datos/coords y registrar centros huérfanos (sin admin).
   ========================================================================== */

type FormState = {
  name: string;
  organization: string;
  address: string;
  schedule: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  website: string;
  email: string;
};

const EMPTY_FORM: FormState = {
  name: '', organization: '', address: '', schedule: '',
  phone: '', whatsapp: '', instagram: '', website: '', email: '',
};

function fromCenter(c: Center): FormState {
  return {
    name: c.name, organization: c.organization, address: c.address,
    schedule: c.schedule, phone: c.phone ?? '', whatsapp: c.whatsapp ?? '',
    instagram: c.instagram ?? '', website: c.website ?? '', email: c.email ?? '',
  };
}

export function SuperCenters() {
  const centers = useQuery(getAllCenters, []);
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
  const [formError, setFormError] = useState<string | null>(null);
  const busy = create.loading || update.loading;

  function openNew() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing('new');
  }
  function openEdit(c: Center) {
    setForm(fromCenter(c));
    setFormError(null);
    setEditing(c);
  }
  function close() {
    setEditing(null);
  }
  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.organization.trim() || !form.address.trim()) {
      setFormError('Nombre, organización y dirección son obligatorios.');
      return;
    }
    try {
      const coords = await forwardGeocode(form.address);
      if (editing === 'new') {
        if (!coords) {
          setFormError('No se pudo ubicar la dirección. Revísala e intenta de nuevo.');
          return;
        }
        await create.mutate({
          name: form.name, organization: form.organization, address: form.address,
          schedule: form.schedule, phone: form.phone, whatsapp: form.whatsapp,
          instagram: form.instagram, website: form.website, email: form.email,
          lat: coords.lat, lng: coords.lng, isApproved: true,
        });
      } else if (editing !== null) {
        const patch: CenterPatch = {
          name: form.name.trim(), organization: form.organization.trim(),
          address: form.address.trim(), schedule: form.schedule.trim(),
          phone: form.phone.trim() || null, whatsapp: form.whatsapp.trim() || null,
          instagram: form.instagram.trim() || null, website: form.website.trim() || null,
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
      centers.refetch();
    } catch {
      // El error ya queda en create.error / update.error; muestra genérico.
      setFormError('No se pudo guardar. Intenta de nuevo.');
    }
  }

  async function onApprove(id: string) {
    await approve.mutate(id);
    centers.refetch();
  }
  async function onReject(id: string) {
    await remove.mutate(id);
    centers.refetch();
  }
  async function onToggleVerified(c: Center) {
    await verify.mutate({ id: c.id, value: !c.is_verified });
    centers.refetch();
  }

  const all = centers.data ?? [];
  const pending = all.filter((c) => !c.is_approved);
  const approved = all.filter((c) => c.is_approved);

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

      <QueryBoundary
        loading={centers.loading}
        error={centers.error}
        onRetry={centers.refetch}
        loadingLabel="Cargando centros…"
      >
        {/* Pendientes */}
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

        {/* Aprobados */}
        <section className="mt-6 flex flex-col gap-3">
          <h2 className="font-display text-h3 font-black text-ink">
            Aprobados ({approved.length})
          </h2>
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
        </section>
      </QueryBoundary>

      <Modal
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? 'Registrar centro' : 'Editar centro'}
        subtitle={editing === 'new'
          ? 'Centro huérfano: queda aprobado y visible al público.'
          : 'Corrige datos o coordenadas (re-geocodifica al cambiar la dirección).'}
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Input label="Nombre" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <Input label="Organización" value={form.organization} onChange={(e) => set('organization', e.target.value)} />
          <Input label="Dirección" value={form.address} onChange={(e) => set('address', e.target.value)} />
          <Input label="Horario" value={form.schedule} onChange={(e) => set('schedule', e.target.value)} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Teléfono" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
            <Input label="Instagram" value={form.instagram} onChange={(e) => set('instagram', e.target.value)} />
            <Input label="Sitio web" value={form.website} onChange={(e) => set('website', e.target.value)} />
          </div>
          <Input label="Correo" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
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
