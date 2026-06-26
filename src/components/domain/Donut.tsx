import { cn } from '@/lib/utils';

/* ===========================================================================
   Donut SVG (dashboard §3.A · identificados vs anónimos). Sin librería de
   gráficos: dos arcos sobre un círculo usando stroke-dasharray. El número
   central y la etiqueta resaltan el valor principal (% con nombre).
   ========================================================================== */

export interface DonutSegment {
  value: number;
  /** Color CSS (token var() o hex). */
  color: string;
  label: string;
}

export interface DonutProps {
  segments: DonutSegment[];
  /** Número grande centrado (ej. "69%"). */
  centerValue: string;
  /** Texto pequeño bajo el número (ej. "con nombre"). */
  centerLabel?: string;
  size?: number;
  thickness?: number;
  className?: string;
}

export function Donut({
  segments,
  centerValue,
  centerLabel,
  size = 160,
  thickness = 18,
  className,
}: DonutProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  let offset = 0;

  return (
    <div className={cn('flex items-center gap-5', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Pista base */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-overlay-bone)"
            strokeWidth={thickness}
          />
          {segments.map((seg, i) => {
            const fraction = seg.value / total;
            const dash = fraction * circumference;
            const circle = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            );
            offset += dash;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-h2 font-black tracking-tightest text-ink">
            {centerValue}
          </span>
          {centerLabel && (
            <span className="font-body text-2xs text-muted">{centerLabel}</span>
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {segments.map((seg, i) => (
          <li key={i} className="flex items-center gap-2 font-body text-sm">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: seg.color }}
            />
            <span className="font-display font-black tracking-snug text-ink">{seg.value}</span>
            <span className="text-body">{seg.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
