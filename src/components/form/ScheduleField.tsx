import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DAY_LABELS,
  EMPTY_BLOCK,
  type DayIndex,
  type ScheduleBlock,
} from '@/lib/schedule';

export interface ScheduleFieldProps {
  label?: string;
  required?: boolean;
  value: ScheduleBlock[];
  onChange: (blocks: ScheduleBlock[]) => void;
  error?: string;
  /** Texto original cuando un horario legado no se pudo parsear a bloques. */
  legacyHint?: string;
}

/**
 * Editor de horario por bloques: cada bloque tiene días (chips) + apertura y
 * cierre. Se pueden añadir/quitar bloques (ej. semana vs. fin de semana). El
 * padre serializa con `serializeSchedule` al enviar.
 */
export function ScheduleField({
  label,
  required,
  value,
  onChange,
  error,
  legacyHint,
}: ScheduleFieldProps) {
  function patch(idx: number, next: Partial<ScheduleBlock>) {
    onChange(value.map((b, i) => (i === idx ? { ...b, ...next } : b)));
  }
  function toggleDay(idx: number, day: DayIndex) {
    const block = value[idx];
    if (!block) return;
    const days = block.days.includes(day)
      ? block.days.filter((d) => d !== day)
      : [...block.days, day];
    patch(idx, { days });
  }
  function addBlock() {
    onChange([...value, { ...EMPTY_BLOCK }]);
  }
  function removeBlock(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="font-body text-sm font-semibold text-ink">
          {label}
          {required && <span className="text-danger-ink"> *</span>}
        </span>
      )}

      <div className="flex flex-col gap-2">
        {value.map((block, idx) => (
          <div
            key={idx}
            className={cn(
              'flex flex-col gap-3 rounded-xl border bg-surface-2 p-3',
              error ? 'border-danger' : 'border-line',
            )}
          >
            {/* Días */}
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label_, d) => {
                const day = d as DayIndex;
                const on = block.days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDay(idx, day)}
                    className={cn(
                      'h-8 min-w-[2.75rem] rounded-pill border px-2 font-body text-xs font-bold transition',
                      on
                        ? 'border-azul bg-azul text-white'
                        : 'border-line bg-surface text-body hover:border-azul',
                    )}
                  >
                    {label_}
                  </button>
                );
              })}
            </div>

            {/* Horas + eliminar */}
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="font-body text-2xs font-bold uppercase tracking-eyebrow text-subtle">
                  Apertura
                </span>
                <input
                  type="time"
                  value={block.open}
                  onChange={(e) => patch(idx, { open: e.target.value })}
                  className="h-control rounded-pill border border-line bg-surface px-3 text-base text-ink focus-visible:border-azul focus-visible:shadow-ring-azul focus-visible:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-body text-2xs font-bold uppercase tracking-eyebrow text-subtle">
                  Cierre
                </span>
                <input
                  type="time"
                  value={block.close}
                  onChange={(e) => patch(idx, { close: e.target.value })}
                  className="h-control rounded-pill border border-line bg-surface px-3 text-base text-ink focus-visible:border-azul focus-visible:shadow-ring-azul focus-visible:outline-none"
                />
              </label>
              {value.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBlock(idx)}
                  aria-label="Quitar bloque de horario"
                  className="ml-auto flex h-control items-center gap-1.5 rounded-pill px-3 font-body text-sm font-semibold text-danger-ink hover:bg-danger-bg"
                >
                  <Trash2 className="h-4 w-4" />
                  Quitar
                </button>
              )}
            </div>

            {block.open !== '' && block.close !== '' && block.close <= block.open && (
              <p className="font-body text-xs font-semibold text-danger-ink">
                El cierre debe ser posterior a la apertura.
              </p>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addBlock}
        className="flex w-fit items-center gap-1.5 font-body text-sm font-semibold text-azul-ink hover:underline"
      >
        <Plus className="h-4 w-4" />
        Añadir otro horario
      </button>

      {error ? (
        <p className="font-body text-xs font-semibold text-danger-ink">{error}</p>
      ) : legacyHint ? (
        <p className="font-body text-xs text-muted">Horario actual: {legacyHint}</p>
      ) : null}
    </div>
  );
}
