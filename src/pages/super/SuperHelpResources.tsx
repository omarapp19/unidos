import { useCallback, useState, type FormEvent, type MouseEvent } from 'react';
import { Link2, Plus, Pencil, Trash2, ChevronRight, Globe } from 'lucide-react';
import type { HelpCategory, HelpLink } from '@/types';
import {
  getHelpCategories, createHelpCategory, updateHelpCategory, deleteHelpCategory,
  getHelpLinks, createHelpLink, updateHelpLink, deleteHelpLink,
} from '@/lib/api/helpResources';
import { useQuery } from '@/lib/hooks/useQuery';
import { useMutation } from '@/lib/hooks/useMutation';
import { Button, Card, Modal, Input, QueryBoundary, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';

/* ===========================================================================
   Panel de superadmin · Recursos de Ayuda Humanitaria.
   Panel izquierdo: categorías (Desaparecidos, Donativos, etc.).
   Panel derecho: enlaces de la categoría seleccionada.
   =========================================================================== */

export function SuperHelpResources() {
  // ── Estado categorías ──────────────────────────────────────────────────────
  const cats = useQuery(getHelpCategories, []);
  const createCat = useMutation(createHelpCategory);
  const updateCat = useMutation((args: { id: string; name: string }) =>
    updateHelpCategory(args.id, args.name),
  );
  const removeCat = useMutation(deleteHelpCategory);

  const [selectedCat, setSelectedCat] = useState<HelpCategory | null>(null);
  const [editingCat, setEditingCat] = useState<HelpCategory | 'new' | null>(null);
  const [catName, setCatName] = useState('');
  const [catError, setCatError] = useState<string | null>(null);
  const catBusy = createCat.loading || updateCat.loading;

  // ── Estado enlaces ─────────────────────────────────────────────────────────
  const links = useQuery(
    () => selectedCat ? getHelpLinks(selectedCat.id) : Promise.resolve([]),
    [selectedCat?.id],
    !!selectedCat,
  );
  const createLnk = useMutation(createHelpLink);
  const updateLnk = useMutation((args: {
    id: string; label: string; description: string; href: string;
  }) => updateHelpLink(args.id, { label: args.label, description: args.description, href: args.href }));
  const removeLnk = useMutation(deleteHelpLink);

  const [editingLink, setEditingLink] = useState<HelpLink | 'new' | null>(null);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkDesc, setLinkDesc] = useState('');
  const [linkHref, setLinkHref] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const linkBusy = createLnk.loading || updateLnk.loading;

  // ── Handlers categorías ────────────────────────────────────────────────────
  function openNewCat() {
    setCatName('');
    setCatError(null);
    setEditingCat('new');
  }

  function openEditCat(c: HelpCategory, e: MouseEvent) {
    e.stopPropagation();
    setCatName(c.name);
    setCatError(null);
    setEditingCat(c);
  }

  const closeCat = useCallback(() => setEditingCat(null), []);

  async function onSubmitCat(e: FormEvent) {
    e.preventDefault();
    setCatError(null);
    if (!catName.trim()) {
      setCatError('El nombre de la categoría es obligatorio.');
      return;
    }
    try {
      if (editingCat === 'new') {
        await createCat.mutate(catName.trim());
      } else if (editingCat) {
        await updateCat.mutate({ id: editingCat.id, name: catName.trim() });
        if (selectedCat?.id === editingCat.id) {
          setSelectedCat((prev) => prev ? { ...prev, name: catName.trim() } : null);
        }
      }
      closeCat();
      cats.refetch();
    } catch {
      setCatError('No se pudo guardar. Intenta de nuevo.');
    }
  }

  async function onDeleteCat(c: HelpCategory, e: MouseEvent) {
    e.stopPropagation();
    if (!confirm(`¿Eliminar la categoría "${c.name}" y todos sus enlaces?`)) return;
    try {
      await removeCat.mutate(c.id);
      if (selectedCat?.id === c.id) setSelectedCat(null);
      cats.refetch();
    } catch {
      // removeCat.error mostrará el detalle
    }
  }

  // ── Handlers enlaces ───────────────────────────────────────────────────────
  function openNewLink() {
    setLinkLabel('');
    setLinkDesc('');
    setLinkHref('');
    setLinkError(null);
    setEditingLink('new');
  }

  function openEditLink(l: HelpLink) {
    setLinkLabel(l.label);
    setLinkDesc(l.description ?? '');
    setLinkHref(l.href);
    setLinkError(null);
    setEditingLink(l);
  }

  const closeLink = useCallback(() => setEditingLink(null), []);

  async function onSubmitLink(e: FormEvent) {
    e.preventDefault();
    setLinkError(null);
    if (!linkLabel.trim() || !linkHref.trim()) {
      setLinkError('El nombre y la URL son obligatorios.');
      return;
    }
    try {
      if (editingLink === 'new') {
        await createLnk.mutate({
          category_id: selectedCat!.id,
          label: linkLabel,
          description: linkDesc,
          href: linkHref,
        });
      } else if (editingLink) {
        await updateLnk.mutate({
          id: editingLink.id,
          label: linkLabel,
          description: linkDesc,
          href: linkHref,
        });
      }
      closeLink();
      links.refetch();
    } catch {
      setLinkError('No se pudo guardar. Intenta de nuevo.');
    }
  }

  async function onDeleteLink(l: HelpLink) {
    if (!confirm(`¿Eliminar el enlace "${l.label}"?`)) return;
    try {
      await removeLnk.mutate(l.id);
      links.refetch();
    } catch {
      // removeLnk.error mostrará el detalle
    }
  }

  const catList = cats.data ?? [];
  const linkList = links.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-h2 font-black text-ink">Recursos de Ayuda</h1>
          <p className="font-body text-sm text-muted">
            Categorías y enlaces mostrados en la sección pública de ayuda humanitaria.
          </p>
        </div>
        <Button onClick={openNewCat} leftIcon={<Plus className="h-4 w-4" />}>
          Nueva categoría
        </Button>
      </header>

      {removeCat.error && (
        <p className="font-body text-sm text-danger-ink">{removeCat.error.message}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">

        {/* ── Panel izquierdo: categorías ── */}
        <div className="flex flex-col gap-2">
          <p className="font-body text-xs font-bold uppercase tracking-eyebrow text-muted px-1">
            Categorías
          </p>
          <QueryBoundary
            loading={cats.loading}
            error={cats.error}
            onRetry={cats.refetch}
            loadingLabel="Cargando categorías…"
          >
            {catList.length === 0 ? (
              <EmptyState
                icon={<Globe className="h-6 w-6" />}
                title="Sin categorías"
                description="Crea la primera categoría de ayuda."
              />
            ) : (
              catList.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCat(c)}
                  className={cn(
                    'group flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition',
                    selectedCat?.id === c.id
                      ? 'border-azul bg-azul/5'
                      : 'border-line-soft bg-surface hover:border-azul/40',
                  )}
                >
                  <span className={cn(
                    'font-display text-sm font-bold',
                    selectedCat?.id === c.id ? 'text-azul' : 'text-ink',
                  )}>
                    {c.name}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <span
                      onClick={(e) => openEditCat(c, e)}
                      className="hidden rounded p-1 text-muted hover:bg-surface-2 hover:text-ink group-hover:inline-flex"
                      aria-label={`Editar ${c.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </span>
                    <span
                      onClick={(e) => onDeleteCat(c, e)}
                      className="hidden rounded p-1 text-muted hover:bg-surface-2 hover:text-danger-ink group-hover:inline-flex"
                      aria-label={`Eliminar ${c.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                    <ChevronRight className={cn(
                      'h-4 w-4 text-muted transition',
                      selectedCat?.id === c.id && 'text-azul',
                    )} />
                  </div>
                </button>
              ))
            )}
          </QueryBoundary>
        </div>

        {/* ── Panel derecho: enlaces ── */}
        <div className="flex flex-col gap-3">
          {selectedCat ? (
            <>
              <div className="flex items-center justify-between">
                <p className="font-body text-xs font-bold uppercase tracking-eyebrow text-muted">
                  Enlaces · <span className="text-azul">{selectedCat.name}</span>
                </p>
                <Button
                  size="sm"
                  onClick={openNewLink}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Nuevo enlace
                </Button>
              </div>

              {removeLnk.error && (
                <p className="font-body text-sm text-danger-ink">{removeLnk.error.message}</p>
              )}

              <QueryBoundary
                loading={links.loading}
                error={links.error}
                onRetry={links.refetch}
                loadingLabel="Cargando enlaces…"
              >
                {linkList.length === 0 ? (
                  <EmptyState
                    icon={<Link2 className="h-6 w-6" />}
                    title="Sin enlaces"
                    description={`Agrega el primer enlace a "${selectedCat.name}".`}
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    {linkList.map((l) => (
                      <Card key={l.id} className="flex items-start justify-between gap-4 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-sm font-bold text-ink">{l.label}</p>
                          {l.description && (
                            <p className="mt-0.5 line-clamp-2 font-body text-xs text-muted">
                              {l.description}
                            </p>
                          )}
                          <a
                            href={l.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block max-w-xs truncate font-body text-xs text-azul hover:underline"
                          >
                            {l.href}
                          </a>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditLink(l)}
                            leftIcon={<Pencil className="h-3.5 w-3.5" />}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDeleteLink(l)}
                            disabled={removeLnk.loading}
                            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </QueryBoundary>
            </>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-line-soft">
              <p className="font-body text-sm text-muted">
                Selecciona una categoría para gestionar sus enlaces.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal categoría */}
      <Modal
        open={editingCat !== null}
        onClose={closeCat}
        title={editingCat === 'new' ? 'Nueva categoría' : 'Editar categoría'}
      >
        <form onSubmit={onSubmitCat} className="flex flex-col gap-3">
          <Input
            label="Nombre"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="Ej. Puntos de ayuda"
            autoFocus
          />
          {catError && <p className="font-body text-sm text-danger-ink">{catError}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeCat} disabled={catBusy}>
              Cancelar
            </Button>
            <Button type="submit" loading={catBusy}>
              {editingCat === 'new' ? 'Crear' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal enlace */}
      <Modal
        open={editingLink !== null}
        onClose={closeLink}
        title={editingLink === 'new' ? 'Nuevo enlace' : 'Editar enlace'}
      >
        <form onSubmit={onSubmitLink} className="flex flex-col gap-3">
          <Input
            label="Nombre del enlace"
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="Ej. Cruz Roja Venezolana"
            autoFocus
          />
          <Input
            label="Descripción"
            value={linkDesc}
            onChange={(e) => setLinkDesc(e.target.value)}
            placeholder="Breve descripción del recurso (opcional)"
          />
          <Input
            label="URL"
            value={linkHref}
            onChange={(e) => setLinkHref(e.target.value)}
            placeholder="https://..."
          />
          {linkError && <p className="font-body text-sm text-danger-ink">{linkError}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeLink} disabled={linkBusy}>
              Cancelar
            </Button>
            <Button type="submit" loading={linkBusy}>
              {editingLink === 'new' ? 'Crear' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
