import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Mensaje de error; activa estado inválido y aria-invalid. */
  error?: string;
  /** Texto de ayuda bajo el campo (se oculta si hay error). */
  hint?: string;
  /** Oculta la etiqueta visual pero la mantiene para lectores de pantalla. */
  hideLabel?: boolean;
  /** Ícono/adorno al inicio del campo. */
  leadingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, hideLabel = false, leadingIcon, id, className, disabled, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'font-body text-sm font-semibold text-ink',
            hideLabel && 'sr-only',
          )}
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leadingIcon && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          >
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-control w-full rounded-pill border bg-surface px-4 text-base text-ink',
            'placeholder:text-subtle',
            'transition focus-visible:shadow-ring-azul focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-70',
            error ? 'border-danger' : 'border-line focus-visible:border-azul',
            leadingIcon && 'pl-11',
            className,
          )}
          {...props}
        />
      </div>

      {error ? (
        <p id={errorId} className="font-body text-xs font-semibold text-danger-ink">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="font-body text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
