import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Etiqueta a la derecha de la casilla. */
  label: ReactNode;
  /** Texto de ayuda bajo la etiqueta. */
  hint?: string;
}

/**
 * Casilla accesible: el `<input>` nativo queda oculto (sr-only) pero conserva
 * foco/teclado; el cuadro visible refleja `checked`. Click en la etiqueta marca.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hint, id, className, checked, disabled, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex cursor-pointer items-start gap-3',
        disabled && 'cursor-not-allowed opacity-70',
        className,
      )}
    >
      <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <span
          aria-hidden
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-md border bg-surface transition',
            'peer-focus-visible:shadow-ring-azul',
            checked ? 'border-azul bg-azul text-white' : 'border-line',
          )}
        >
          {checked && <Check className="h-3.5 w-3.5" />}
        </span>
      </span>
      <span className="flex flex-col">
        <span className="font-body text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="font-body text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
});
