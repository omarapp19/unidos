import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';

/** Valores de una fila del formulario de recepción. */
export interface DonationRowValue {
  categoryId: string;
  product: string;
  /** Cantidad como string para controlar el <input>; el padre valida > 0. */
  quantity: string;
}

export interface DonationFormRowProps {
  /** Índice de la fila (para labels accesibles únicos). */
  index: number;
  value: DonationRowValue;
  categories: Category[];
  onChange: (value: DonationRowValue) => void;
  onRemove: () => void;
  /** Si false, oculta el botón eliminar (p. ej. única fila obligatoria). */
  removable?: boolean;
  className?: string;
}

/**
 * Una fila del formulario de recepción (PRD §3.B): categoría + descripción +
 * cantidad, con botón para eliminar. Presentacional puro: el formulario padre
 * gestiona el arreglo de N filas (añadir/quitar) y el envío.
 * Mobile-first: apila en columna; en md pasa a fila con la cantidad estrecha.
 */
export function DonationFormRow({
  index,
  value,
  categories,
  onChange,
  onRemove,
  removable = true,
  className,
}: DonationFormRowProps) {
  const n = index + 1;

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-3 md:grid-cols-[1fr_1.5fr_auto_auto] md:items-end',
        className,
      )}
    >
      <Select
        label={`Categoría (producto ${n})`}
        hideLabel
        placeholder="Categoría"
        value={value.categoryId}
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        onChange={(categoryId) => onChange({ ...value, categoryId })}
      />

      <Input
        label={`Descripción (producto ${n})`}
        hideLabel
        placeholder="Producto (ej. Caja de agua)"
        value={value.product}
        onChange={(e) => onChange({ ...value, product: e.target.value })}
      />

      <Input
        label={`Cantidad (producto ${n})`}
        hideLabel
        type="number"
        inputMode="numeric"
        min={1}
        placeholder="Cant."
        value={value.quantity}
        onChange={(e) => onChange({ ...value, quantity: e.target.value })}
        className="md:w-24"
      />

      {removable && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Eliminar producto ${n}`}
          className={cn(
            'flex h-control items-center justify-center rounded-pill border border-line px-4',
            'font-body text-sm font-bold text-danger-ink',
            'transition hover:bg-danger-bg focus-visible:shadow-ring-azul focus-visible:outline-none',
            'md:w-control md:px-0',
          )}
        >
          <span aria-hidden className="md:hidden">
            Eliminar
          </span>
          <X aria-hidden className="hidden h-5 w-5 md:inline" />
        </button>
      )}
    </div>
  );
}
