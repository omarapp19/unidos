import {
  MapPin,
  Clock,
  Phone,
  Mail,
  Globe,
  AtSign,
  MessageCircle,
  Navigation,
  ArrowRight,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { Center } from '@/types';
import { buildDirectionsUrl } from '@/lib/utils';
import { formatDistance } from '@/lib/geo';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CenterStatusBadge, VerifiedBadge } from '@/components/ui/Badge';

export interface CenterDetailModalProps {
  /** Centro a mostrar; `null` mantiene el modal cerrado. */
  center: Center | null;
  open: boolean;
  onClose: () => void;
  /** Distancia desde la ubicación del usuario, si la hay. */
  distanceKm?: number | null;
  /** Insumos que el centro necesita con urgencia. */
  urgentSupplies?: string[];
  /** Categorías que el centro ya recibe con frecuencia (cualitativo). */
  receivedCategories?: string[];
}

/** Una fila de contacto (icono + etiqueta + valor enlazable). */
function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border border-line-soft bg-surface-2 px-3 py-2.5 transition hover:border-azul hover:bg-azul/8 focus-visible:shadow-ring-azul focus-visible:outline-none"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-azul/12 text-azul">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-body text-2xs font-bold uppercase tracking-eyebrow text-subtle">
          {label}
        </span>
        <span className="block truncate font-body text-sm font-semibold text-ink">{value}</span>
      </span>
      <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-muted" />
    </a>
  );
}

/**
 * Ficha ampliada del centro (PRD §1.B + §6.4/§6.5). Muestra los canales de contacto
 * —teléfono, WhatsApp, Instagram, web, correo—, el sello de verificación, horario,
 * dirección, insumos urgentes y el botón "Cómo llegar".
 */
export function CenterDetailModal({
  center,
  open,
  onClose,
  distanceKm,
  urgentSupplies = [],
  receivedCategories = [],
}: CenterDetailModalProps) {
  if (!center) return null;

  // El nombre es opcional; si falta, usamos la organización como título.
  const title = center.name?.trim() || center.organization;
  const directions = buildDirectionsUrl(center.lat, center.lng, title);
  const hasContact =
    center.phone || center.whatsapp || center.instagram || center.website || center.email;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span>{center.organization}</span>
          {center.is_verified && <VerifiedBadge variant="icon" />}
        </span>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Estado + verificación + distancia */}
        <div className="flex flex-wrap items-center gap-2">
          <CenterStatusBadge status={center.status} />
          {center.is_verified && <VerifiedBadge />}
          {distanceKm != null && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-surface-3 px-3 py-1 font-body text-2xs font-bold text-body">
              <Navigation aria-hidden className="h-3.5 w-3.5 text-azul" />a {formatDistance(distanceKm)}
            </span>
          )}
        </div>

        {/* Dirección + horario */}
        <dl className="flex flex-col gap-2 font-body text-sm text-body">
          <div className="flex gap-2">
            <dt className="sr-only">Dirección</dt>
            <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-azul" />
            <dd>{center.address}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="sr-only">Horario</dt>
            <Clock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-azul" />
            <dd>{center.schedule}</dd>
          </div>
        </dl>

        {/* Insumos urgentes */}
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

        {/* Lo que ya recibe */}
        {receivedCategories.length > 0 && (
          <div>
            <p className="mb-1.5 font-body text-2xs font-bold uppercase tracking-eyebrow text-subtle">
              Lo que ya recibe con frecuencia
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {receivedCategories.map((cat) => (
                <li
                  key={cat}
                  className="rounded-pill bg-success-bg px-3 py-1 font-body text-2xs font-bold text-success-ink"
                >
                  {cat}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Contacto y redes */}
        {hasContact && (
          <div>
            <p className="mb-2 font-body text-2xs font-bold uppercase tracking-eyebrow text-subtle">
              Contacto y redes
            </p>
            <div className="flex flex-col gap-2">
              {center.phone && (
                <ContactRow
                  icon={<Phone className="h-4 w-4" />}
                  label="Teléfono"
                  value={center.phone}
                  href={`tel:${center.phone.replace(/\s/g, '')}`}
                />
              )}
              {center.whatsapp && (
                <ContactRow
                  icon={<MessageCircle className="h-4 w-4" />}
                  label="WhatsApp"
                  value="Enviar mensaje"
                  href={`https://wa.me/${center.whatsapp}`}
                />
              )}
              {center.instagram && (
                <ContactRow
                  icon={<AtSign className="h-4 w-4" />}
                  label="Instagram"
                  value={`@${center.instagram}`}
                  href={`https://instagram.com/${center.instagram}`}
                />
              )}
              {center.website && (
                <ContactRow
                  icon={<Globe className="h-4 w-4" />}
                  label="Sitio web"
                  value={center.website.replace(/^https?:\/\//, '')}
                  href={center.website}
                />
              )}
              {center.email && (
                <ContactRow
                  icon={<Mail className="h-4 w-4" />}
                  label="Correo"
                  value={center.email}
                  href={`mailto:${center.email}`}
                />
              )}
            </div>
          </div>
        )}

        {/* Cómo llegar */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => window.open(directions.web, '_blank', 'noopener,noreferrer')}
          rightIcon={<ArrowRight aria-hidden className="h-4 w-4" />}
        >
          Cómo llegar
        </Button>
      </div>
    </Modal>
  );
}
