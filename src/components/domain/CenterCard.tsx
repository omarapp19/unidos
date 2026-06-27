import { MapPin, Clock, ArrowRight, Navigation, Info } from 'lucide-react';
import { cn, buildDirectionsUrl } from '@/lib/utils';
import { formatDistance } from '@/lib/geo';
import type { Center } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CenterStatusBadge, VerifiedBadge } from '@/components/ui/Badge';

/** Solo los campos que la tarjeta necesita pintar (presentacional). */
export type CenterCardData = Pick<
  Center,
  'name' | 'address' | 'schedule' | 'status' | 'lat' | 'lng' | 'organization' | 'is_verified'
>;

export interface CenterCardProps {
  center: CenterCardData;
  /** Insumos que el centro necesita con urgencia. */
  urgentSupplies?: string[];
  /** Distancia en km desde la ubicación del usuario (si la hay). Pinta "a 850 m". */
  distanceKm?: number | null;
  /** Resalta la tarjeta (centro más cercano). */
  highlighted?: boolean;
  /** Densidad reducida para listas en mobile / panel lateral. */
  compact?: boolean;
  /** Click en la tarjeta (p. ej. centrar el pin en el mapa). */
  onSelect?: () => void;
  /** Abre la ficha ampliada con contacto y redes. Si falta, no se muestra el botón. */
  onDetails?: () => void;
  className?: string;
}

/**
 * Ficha de centro (PRD §1.B). Funciona como tarjeta en lista mobile y en el
 * panel lateral de desktop. Muestra distancia desde el usuario y sello de
 * organización verificada. El botón "Cómo llegar" abre indicaciones vía deep link
 * (geo: en móvil, Google Maps como destino universal); "Ver detalles" abre la ficha
 * ampliada con teléfono y redes.
 */
export function CenterCard({
  center,
  urgentSupplies = [],
  distanceKm,
  highlighted = false,
  compact = false,
  onSelect,
  onDetails,
  className,
}: CenterCardProps) {
  const { name, address, schedule, status, lat, lng, organization, is_verified } = center;
  // El nombre es opcional; si falta, mostramos la organización como título.
  const title = name?.trim() || organization;
  const directions = buildDirectionsUrl(lat, lng, title);

  return (
    <Card
      variant={compact ? 'compact' : 'default'}
      highlighted={highlighted}
      onClick={onSelect}
      className={cn(onSelect && 'cursor-pointer', 'flex flex-col gap-3', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display text-h3 font-black tracking-snug text-ink">
              {title}
            </h3>
            {is_verified && <VerifiedBadge variant="icon" />}
          </div>
          {name?.trim() && (
            <p className="mt-0.5 font-body text-xs text-muted">{organization}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <CenterStatusBadge status={status} />
          {distanceKm != null && (
            <span className="inline-flex items-center gap-1 font-body text-2xs font-bold text-body">
              <Navigation aria-hidden className="h-3 w-3 text-azul" />a {formatDistance(distanceKm)}
            </span>
          )}
        </div>
      </div>

      <dl className="flex flex-col gap-1.5 font-body text-sm text-body">
        <div className="flex gap-2">
          <dt className="sr-only">Dirección</dt>
          <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-azul" />
          <dd>{address}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="sr-only">Horario</dt>
          <Clock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-azul" />
          <dd>{schedule}</dd>
        </div>
      </dl>

      {urgentSupplies.length > 0 && (
        <div>
          <p className="mb-1.5 font-body text-2xs font-bold uppercase tracking-eyebrow text-subtle">
            Necesita con urgencia
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {urgentSupplies.map((supply) => (
              <li
                key={supply}
                className="rounded-pill bg-warning-bg px-3 py-1 font-body text-2xs font-bold text-warning-ink"
              >
                {supply}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        {onDetails && (
          <Button
            variant="ghost"
            size={compact ? 'md' : 'lg'}
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              onDetails();
            }}
            leftIcon={<Info aria-hidden className="h-4 w-4" />}
          >
            Ver detalles
          </Button>
        )}
        <Button
          variant="primary"
          size={compact ? 'md' : 'lg'}
          fullWidth
          // El navegador resuelve geo: en móvil; en desktop cae a Google Maps.
          onClick={(e) => {
            e.stopPropagation();
            window.open(directions.web, '_blank', 'noopener,noreferrer');
          }}
          rightIcon={<ArrowRight aria-hidden className="h-4 w-4" />}
        >
          Cómo llegar
        </Button>
      </div>
    </Card>
  );
}
