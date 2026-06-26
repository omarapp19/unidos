import { useState, type FormEvent } from 'react';
import { Tags, Plus, Pencil, Trash2 } from 'lucide-react';
import type { Category } from '@/types';
import { getCategories } from '@/lib/api/categories';
import { createCategory, updateCategory, deleteCategory } from '@/lib/api/categories';
import { useQuery } from '@/lib/hooks/useQuery';
import { useMutation } from '@/lib/hooks/useMutation';
import { Button, Card, Modal, Input, QueryBoundary, EmptyState } from '@/components/ui';

/* ===========================================================================
   Panel de superadmin · catálogo de categorías (insumos). CRUD simple.
   ========================================================================== */

export function SuperCategories() {
  const cats = useQuery(getCategories, []);
  const create = useMutation(createCategory);
  const update = useMutation((args: { id: string; name: string; unit: string }) =>
    updateCategory(args.id, { name: args.name, unit: args.unit }),
  );
  const remove = useMutation(deleteCategory);

  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const busy = create.loading || update.loading;

  function openNew() {
    setName('');
    setUnit('');
    setFormError(null);
    setEditing('new');
  }
  function openEdit(c: Category) {
    setName(c.name);
    setUnit(c.unit);
    setFormError(null);
    setEditing(c);
  }
  function close() {
    setEditing(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !unit.trim()) {
      setFormError('Nombre y unidad son obligatorios.');
      return;
    }
    try {
      if (editing === 'new') {
        await create.mutate({ name, unit });
      } else if (editing !== null) {
        await update.mutate({ id: editing.id, name, unit });
      }
      close();
      cats.refetch();
    } catch {
      setFormError('No se pudo guardar. Intenta de nuevo.');
    }
  }

  async function onDelete(c: Category) {
    try {
      await remove.mutate(c.id);
      cats.refetch();
    } catch {
      // remove.error muestra el detalle (p. ej. categoría con ítems asociados).
    }
  }

  const list = cats.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-h2 font-black text-ink">Categorías</h1>
          <p className="font-body text-sm text-muted">Catálogo controlado de insumos.</p>
        </div>
        <Button onClick={openNew} leftIcon={<Plus className="h-4 w-4" />}>Nueva categoría</Button>
      </header>

      {remove.error && (
        <p className="font-body text-sm text-danger-ink">{remove.error.message}</p>
      )}

      <QueryBoundary
        loading={cats.loading}
        error={cats.error}
        onRetry={cats.refetch}
        loadingLabel="Cargando categorías…"
      >
        {list.length === 0 ? (
          <EmptyState
            icon={<Tags className="h-6 w-6" />}
            title="Sin categorías"
            description="Crea la primera categoría de insumos."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {list.map((c) => (
              <Card key={c.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-display text-base font-black text-ink">{c.name}</p>
                  <p className="font-body text-sm text-muted">Unidad: {c.unit}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}
                    leftIcon={<Pencil className="h-4 w-4" />}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(c)}
                    leftIcon={<Trash2 className="h-4 w-4" />}>Eliminar</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>

      <Modal
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? 'Nueva categoría' : 'Editar categoría'}
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Unidad" hint="Ej. litros, unidades, kg"
            value={unit} onChange={(e) => setUnit(e.target.value)} />
          {formError && <p className="font-body text-sm text-danger-ink">{formError}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close} disabled={busy}>Cancelar</Button>
            <Button type="submit" loading={busy}>{editing === 'new' ? 'Crear' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
