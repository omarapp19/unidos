import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

export interface StatTrend {
  direction: 'up' | 'down';
  /** Texto de la variación (p. ej. "+12%" o "3 más que ayer"). */
  label: string;
}

export interface StatWidgetProps {
  /** Ícono decorativo. */
  icon?: ReactNode;
  /** Número/valor grande (ej. "47", "450 L"). */
  value: ReactNode;
  /** Etiqueta descriptiva (ej. "Donantes hoy"). */
  label: string;
  trend?: StatTrend;
  className?: string;
}

/**
 * Tarjeta de métrica del dashboard (PRD §3.A): ícono + número grande (Sora) +
 * etiqueta + tendencia opcional. La tendencia "up" no siempre es buena, así que
 * se colorea de forma neutra-positiva (success ↑ / danger ↓) por convención.
 */
export function StatWidget({ icon, value, label, trend, className }: StatWidgetProps) {
  return (
    <Card className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        {icon && (
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-2 text-azul"
          >
            {icon}
          </span>
        )}
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-1 font-body text-2xs font-bold',
              trend.direction === 'up' ? 'text-success-ink' : 'text-danger-ink',
            )}
          >
            {trend.direction === 'up' ? (
              <TrendingUp aria-hidden className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown aria-hidden className="h-3.5 w-3.5" />
            )}
            {trend.label}
          </span>
        )}
      </div>
      <p className="font-display text-h1 font-black leading-none tracking-tightest text-ink">
        {value}
      </p>
      <p className="font-body text-sm text-body">{label}</p>
    </Card>
  );
}
