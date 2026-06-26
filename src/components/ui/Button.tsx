import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Muestra spinner y deshabilita el botón. */
  loading?: boolean;
  /** Ocupa todo el ancho del contenedor (útil en mobile). */
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

// rojo = acción principal · azul = confianza · ghost = secundaria discreta · danger = destructivo
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-rojo text-white hover:brightness-95 active:brightness-90',
  secondary: 'bg-azul text-white hover:brightness-95 active:brightness-90',
  ghost:
    'bg-transparent text-ink border border-line hover:bg-surface-2 active:bg-surface-3',
  danger: 'bg-danger text-white hover:brightness-95 active:brightness-90',
};

// Alturas del DS: lg = control (48px), sm = control-sm (30px).
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-control-sm px-4 text-2xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-control px-6 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    disabled,
    className,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill',
        'font-display font-black tracking-snug',
        'transition focus-visible:shadow-ring-azul focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" label="" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
});
