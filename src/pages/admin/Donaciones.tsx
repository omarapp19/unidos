import { useState, type FormEvent } from 'react';
import { Plus, UserRound, CheckCircle2 } from 'lucide-react';
import { categories, currentProfile } from '@/lib/mock-data';
import {
  initialRows,
  addRow,
  updateRow,
  removeRow,
  validateDonationForm,
  isFormValid,
  buildDonationPayload,
  type DonationFormErrors,
} from '@/lib/donation-form';
import { useData } from '@/lib/store';
import { Button, Card, Input } from '@/components/ui';
import { DonationFormRow, type DonationRowValue } from '@/components/domain';

/* ===========================================================================
   Recepción de donaciones (PRD §3.B). Formulario operativo: nombre opcional +
   N filas de producto (categoría · descripción · cantidad). Registrar valida,
   construye el payload y lo añade al store (refleja al instante en dashboard e
   historial). Objetivo: registrar en < 30 s desde el celular.
   ========================================================================== */

export function Donaciones() {
  const { addDonation } = useData();
  const [donorName, setDonorName] = useState('');
  const [rows, setRows] = useState<DonationRowValue[]>(initialRows);
  const [errors, setErrors] = useState<DonationFormErrors>({ rows: {} });
  const [savedCount, setSavedCount] = useState<number | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = validateDonationForm(rows);
    setErrors(result);
    if (!isFormValid(result)) return;

    const payload = buildDonationPayload({
      centerId: currentProfile.center_id,
      createdBy: currentProfile.id,
      donorName,
      rows,
    });
    addDonation(payload);
    setSavedCount(payload.items.length);

    // Reset para la próxima donación.
    setDonorName('');
    setRows(initialRows());
    setErrors({ rows: {} });
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

      {savedCount != null && (
        <div className="flex items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-success-ink">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
          <p className="font-body text-sm font-semibold">
            Donación registrada con {savedCount} {savedCount === 1 ? 'producto' : 'productos'}.
          </p>
        </div>
      )}

      <Card>
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

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="submit" variant="primary" size="lg">
              Registrar donación
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
