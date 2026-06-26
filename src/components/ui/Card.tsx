import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `compact` reduce el padding (pensado para listas densas en mobile). */
  variant?: 'default' | 'compact';
  /** Resalta la tarjeta (p. ej. centro más cercano) con anillo azul. */
  highlighted?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'default', highlighted = false, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-line-soft bg-surface text-ink shadow-card',
        variant === 'compact' ? 'p-3 sm:p-4' : 'p-5',
        highlighted && 'border-azul shadow-ring-azul',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
