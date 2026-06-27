import { useCallback, useState, type FormEvent } from 'react';
import { Boxes, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  getNeededSupplies,
  addNeededSupply,
  updateNeededSupply,
  deleteNeededSupply,
  type NeededSupply,
} from '@/lib/api/supplies';
import { useQuery } from '@/lib/hooks/useQuery';
import { useMutation } from '@/lib/hooks/useMutation';
import { Button, Card, Modal, Input, QueryBoundary, EmptyState } from '@/components/ui';

/* ===========================================================================
   Panel de superadmin · catálogo de insumos críticos. CRUD.
   ========================================================================== */

export function SuperSupplies() {
  const supplies = useQuery(getNeededSupplies, []);
  const create = useMutation((name: string) => addNeededSupply(name, null));
  const update = useMutation((args: { id: string; name: string }) =>
    updateNeededSupply(args.id, args.name),
  );
  const remove = useMutation(deleteNeededSupply);

  const [editing, setEditing] = useState<NeededSupply | 'new' | null>(null);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const busy = create.loading || update.loading;

  function openNew() {
    setName('');
    setFormError(null);
    setEditing('new');
  }

  function openEdit(s: NeededSupply) {
    setName(s.name);
    setFormError(null);
    setEditing(s);
  }

  const close = useCallback(() => {
    setEditing(null);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('El nombre del insumo es obligatorio.');
      return;
    }
    try {
      if (editing === 'new') {
        await create.mutate(name.trim());
      } else if (editing !== null) {
        await update.mutate({ id: editing.id, name: name.trim() });
      }
      close();
      supplies.refetch();
    } catch (err: any) {
      setFormError(err?.message ?? 'No se pudo guardar. Intenta de nuevo.');
    }
  }

  async function onDelete(s: NeededSupply) {
    if (!confirm(`¿Estás seguro de eliminar el insumo "${s.name}"?`)) return;
    try {
      await remove.mutate(s.id);
      supplies.refetch();
    } catch {
      // remove.error muestra el detalle
    }
  }

  const list = supplies.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-h2 font-black text-ink">Insumos Críticos</h1>
          <p className="font-body text-sm text-muted">
            Insumos más necesitados que aparecen en el banner de la landing pública.
          </p>
        </div>
        <Button onClick={openNew} leftIcon={<Plus className="h-4 w-4" />}>
          Nuevo insumo
        </Button>
      </header>

      {remove.error && (
        <p className="font-body text-sm text-danger-ink">{remove.error.message}</p>
      )}

      <QueryBoundary
        loading={supplies.loading}
        error={supplies.error}
        onRetry={supplies.refetch}
        loadingLabel="Cargando insumos críticos…"
      >
        {list.length === 0 ? (
          <EmptyState
            icon={<Boxes className="h-6 w-6" />}
            title="Sin insumos críticos"
            description="Agrega el primer insumo crítico para mostrar en la landing pública."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {list.map((s) => (
              <Card key={s.id} className="flex items-center justify-between p-4 bg-surface">
                <div>
                  <p className="font-display text-base font-black text-ink">{s.name}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(s)}
                    leftIcon={<Pencil className="h-4 w-4" />}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(s)}
                    disabled={remove.loading}
                    leftIcon={<Trash2 className="h-4 w-4" />}
                  >
                    Eliminar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>

      <Modal
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? 'Nuevo insumo crítico' : 'Editar insumo crítico'}
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Input
            label="Nombre del insumo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Cobijas, Alimentos no perecederos..."
            autoFocus
          />
          {formError && <p className="font-body text-sm text-danger-ink">{formError}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" loading={busy}>
              {editing === 'new' ? 'Crear' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
