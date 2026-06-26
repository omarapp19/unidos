import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /** Ícono o ilustración (decorativo). */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Acción opcional (p. ej. un <Button>). */
  action?: ReactNode;
  className?: string;
}

/**
 * Estado vacío reutilizable: mapa sin centros, historial sin donaciones, etc.
 * Centrado, mobile-first.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div
          aria-hidden
          className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-muted"
        >
          {icon}
        </div>
      )}
      <h3 className="font-display text-h3 font-black tracking-snug text-ink">{title}</h3>
      {description && (
        <p className="max-w-sm font-body text-sm text-body">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
