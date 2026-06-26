import { cn } from '@/lib/utils';

export type CategoryBarColor = 'azul' | 'amarillo' | 'rojo' | 'success';

export interface CategoryBarProps {
  label: string;
  /** Porcentaje 0–100. Se recorta a ese rango. */
  percentage: number;
  /** Texto opcional a la derecha (ej. "450 L" en el dashboard; en público se omite). */
  valueText?: string;
  color?: CategoryBarColor;
  className?: string;
}

const fillColor: Record<CategoryBarColor, string> = {
  azul: 'bg-azul',
  amarillo: 'bg-amarillo',
  rojo: 'bg-rojo',
  success: 'bg-success',
};

/**
 * Barra horizontal de progreso con etiqueta y porcentaje.
 * Vista pública (§1.C): solo porcentajes por categoría — sin cantidades.
 * Dashboard (§3.A): puede mostrar `valueText` con la cantidad del propio centro.
 * Accesible: role="progressbar" con aria-valuenow/min/max.
 */
export function CategoryBar({
  label,
  percentage,
  valueText,
  color = 'azul',
  className,
}: CategoryBarProps) {
  const pct = Math.max(0, Math.min(100, percentage));

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-body text-sm font-semibold text-ink">{label}</span>
        <span className="font-display text-sm font-black tracking-snug text-body">
          {valueText ?? `${Math.round(pct)}%`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2.5 w-full overflow-hidden rounded-full bg-bone"
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', fillColor[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
