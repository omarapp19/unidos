import type { ReactNode } from 'react';
import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CenterStatus, UserRole } from '@/types';

export type BadgeTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'azul'
  | 'neutral';

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

// Cada tono usa el par -bg / -ink del DS → contraste correcto en claro y oscuro.
const toneClasses: Record<BadgeTone, string> = {
  success: 'bg-success-bg text-success-ink',
  warning: 'bg-warning-bg text-warning-ink',
  danger: 'bg-danger-bg text-danger-ink',
  azul: 'bg-azul/12 text-azul-ink',
  neutral: 'bg-surface-3 text-body',
};

/** Chip de estado/etiqueta. Pill, tipografía pequeña en mayúscula sutil. */
export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-3 py-1',
        'font-body text-2xs font-bold tracking-wide',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Helpers de dominio ---------------------------------------- */

const statusConfig: Record<CenterStatus, { tone: BadgeTone; label: string }> = {
  receiving: { tone: 'success', label: 'Recibiendo' },
  full: { tone: 'warning', label: 'Lleno' },
  closed: { tone: 'danger', label: 'Cerrado' },
};

/** Badge del estado operativo del centro (mapea CenterStatus → tono + texto). */
export function CenterStatusBadge({
  status,
  className,
}: {
  status: CenterStatus;
  className?: string;
}) {
  const { tone, label } = statusConfig[status];
  return (
    <Badge tone={tone} className={className}>
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full bg-current"
      />
      {label}
    </Badge>
  );
}

/**
 * Sello de centro/organización verificada (PRD §6.5). Genera confianza al público:
 * la organización fue validada por un coordinador autorizado. Dos formatos:
 * `full` (chip con texto) y `icon` (solo el check, para junto al nombre).
 */
export function VerifiedBadge({
  variant = 'full',
  className,
}: {
  variant?: 'full' | 'icon';
  className?: string;
}) {
  if (variant === 'icon') {
    return (
      <BadgeCheck
        aria-label="Centro verificado"
        className={cn('h-4 w-4 shrink-0 text-azul', className)}
      />
    );
  }
  return (
    <Badge tone="azul" className={className}>
      <BadgeCheck aria-hidden className="h-3.5 w-3.5" />
      Verificado
    </Badge>
  );
}

const roleConfig: Record<UserRole, { tone: BadgeTone; label: string }> = {
  admin: { tone: 'azul', label: 'Admin' },
  superadmin: { tone: 'warning', label: 'Superadmin' },
};

/** Badge del rol del usuario. */
export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  const { tone, label } = roleConfig[role];
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  );
}
