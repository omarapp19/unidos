import { cn } from '@/lib/utils';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  /** Texto para lectores de pantalla. */
  label?: string;
}

const sizeMap: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
};

/** Indicador de carga. Hereda el color del texto (currentColor) del contenedor. */
export function Spinner({ size = 'md', className, label = 'Cargando…' }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex', className)}>
      <span
        className={cn(
          'inline-block animate-spin rounded-full border-current border-r-transparent',
          sizeMap[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
