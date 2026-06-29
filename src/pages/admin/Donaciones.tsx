import { useState, type FormEvent } from 'react';
import { Plus, UserRound, CheckCircle2, CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@/lib/hooks/useQuery';
import { useMutation } from '@/lib/hooks/useMutation';
import { getCategories } from '@/lib/api/categories';
import { createDonation } from '@/lib/api/donations';
import { toApiError } from '@/lib/api/errors';
import { enqueueDonation } from '@/lib/offline/outbox';
import { useOfflineSync } from '@/lib/offline/useOfflineSync';
import {
  initialRows,
  addRow,
  updateRow,
  removeRow,
  validateDonationForm,
  isFormValid,
  isRowComplete,
  type DonationFormErrors,
} from '@/lib/donation-form';
import { Button, Card, Input, QueryBoundary } from '@/components/ui';
import { DonationFormRow, type DonationRowValue } from '@/components/domain';

/* ===========================================================================
   Recepción de donaciones (PRD §3.B). Formulario operativo: nombre opcional +
   N filas de producto (categoría · descripción · cantidad). Registrar valida,
   construye el payload y lo añade al store (refleja al instante en dashboard e
   historial). Objetivo: registrar en < 30 s desde el celular.
   ========================================================================== */

export function Donaciones() {
  const { profile } = useAuth();
  const centerId = profile?.center_id ?? '';
  const categoriesQuery = useQuery(getCategories, []);
  const categories = categoriesQuery.data ?? [];
  const save = useMutation(createDonation);
  const { online, pending, syncing, syncNow } = useOfflineSync();

  const [donorName, setDonorName] = useState('');
  const [rows, setRows] = useState<DonationRowValue[]>(initialRows);
  const [errors, setErrors] = useState<DonationFormErrors>({ rows: {} });
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [queuedCount, setQueuedCount] = useState<number | null>(null);
  const [offlineError, setOfflineError] = useState<string | null>(null);

  /** Vacía el formulario tras un alta (online u offline) exitosa. */
  function resetForm() {
    setDonorName('');
    setRows(initialRows());
    setErrors({ rows: {} });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSavedCount(null);
    setQueuedCount(null);
    setOfflineError(null);
    const result = validateDonationForm(rows);
    setErrors(result);
    if (!isFormValid(result)) return;
    if (!centerId) return;

    const items = rows.filter(isRowComplete).map((r) => ({
      category_id: r.categoryId,
      product: r.product.trim(),
      quantity: Number(r.quantity),
    }));

    // Sin conexión: guarda en la cola local; se enviará al reconectar.
    if (!online) {
      await queueOffline(items.length, items);
      return;
    }

    try {
      await save.mutate({ centerId, donorName, items });
      setSavedCount(items.length);
      resetForm();
    } catch (err) {
      // Si el fallo es de red, no se pierde: se encola para reintento.
      if (toApiError(err).retryable) {
        await queueOffline(items.length, items);
      }
      // Errores definitivos quedan en `save.error` bajo el formulario.
    }
  }

  /** Guarda la donación en la cola offline y refleja el resultado en la UI. */
  async function queueOffline(
    count: number,
    items: { category_id: string; product: string; quantity: number }[],
  ) {
    try {
      await enqueueDonation({ centerId, donorName, items });
      setQueuedCount(count);
      resetForm();
    } catch {
      setOfflineError('No pudimos guardar la donación localmente. Intenta de nuevo.');
    }
  }

  const isAnonymous = donorName.trim() === '';

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-h1 font-black tracking-tightest text-ink">
          Registrar donación
        </h1>
        <p className="mt-1 font-body text-base text-body">
          Anota lo que entra al centro. El nombre es opcional — sin nombre cuenta como anónimo.
        </p>
      </header>

      {/* Estado de conexión / cola offline */}
      {(!online || pending > 0) && (
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {online ? (
              <CloudOff className="h-5 w-5 shrink-0 text-warning-ink" aria-hidden />
            ) : (
              <WifiOff className="h-5 w-5 shrink-0 text-warning-ink" aria-hidden />
            )}
            <p className="font-body text-sm text-body">
              {!online && 'Sin conexión — las donaciones se guardan en este dispositivo. '}
              {pending > 0
                ? `${pending} ${pending === 1 ? 'donación pendiente' : 'donaciones pendientes'} de sincronizar.`
                : 'Se enviarán al volver la conexión.'}
            </p>
          </div>
          {pending > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void syncNow()}
              loading={syncing}
              disabled={!online}
              leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
            >
              Sincronizar ahora
            </Button>
          )}
        </div>
      )}

      {savedCount != null && (
        <div className="flex items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-success-ink">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
          <p className="font-body text-sm font-semibold">
            Donación registrada con {savedCount} {savedCount === 1 ? 'producto' : 'productos'}.
          </p>
        </div>
      )}

      {queuedCount != null && (
        <div className="flex items-center gap-2 rounded-lg bg-warning-bg px-4 py-3 text-warning-ink">
          <CloudOff className="h-5 w-5 shrink-0" aria-hidden />
          <p className="font-body text-sm font-semibold">
            Donación guardada sin conexión ({queuedCount}{' '}
            {queuedCount === 1 ? 'producto' : 'productos'}). Se enviará al reconectar.
          </p>
        </div>
      )}

      {offlineError && (
        <p className="font-body text-sm font-semibold text-danger-ink">{offlineError}</p>
      )}

      <Card>
        <QueryBoundary
          loading={categoriesQuery.loading}
          error={categoriesQuery.error}
          onRetry={categoriesQuery.refetch}
          loadingLabel="Cargando categorías…"
        >
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          {/* Donante */}
          <div>
            <Input
              label="Nombre del donante"
              placeholder="Opcional — deja vacío para anónimo"
              leadingIcon={<UserRound className="h-4 w-4" aria-hidden />}
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              hint={isAnonymous ? 'Se registrará como Anónimo' : undefined}
            />
          </div>

          {/* Productos */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-h3 font-black tracking-snug text-ink">Productos</h2>
              <span className="font-body text-xs text-muted">
                {rows.length} {rows.length === 1 ? 'fila' : 'filas'}
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {rows.map((row, i) => {
                const rowError = errors.rows[i];
                return (
                  <div key={i} className="flex flex-col gap-1">
                    <DonationFormRow
                      index={i}
                      value={row}
                      categories={categories}
                      removable={rows.length > 1}
                      onChange={(value) => setRows((prev) => updateRow(prev, i, value))}
                      onRemove={() => setRows((prev) => removeRow(prev, i))}
                    />
                    {rowError && (
                      <p className="font-body text-xs font-semibold text-danger-ink">
                        {rowError.categoryId ?? rowError.product ?? rowError.quantity}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRows((prev) => addRow(prev))}
                leftIcon={<Plus className="h-4 w-4" aria-hidden />}
              >
                Añadir producto
              </Button>
            </div>
          </div>

          {errors.form && (
            <p className="font-body text-sm font-semibold text-danger-ink">{errors.form}</p>
          )}
          {save.error && (
            <p className="font-body text-sm font-semibold text-danger-ink">{save.error.message}</p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="submit" variant="primary" size="lg" loading={save.loading}>
              Registrar donación
            </Button>
          </div>
        </form>
        </QueryBoundary>
      </Card>
    </div>
  );
}
