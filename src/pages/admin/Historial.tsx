import { useMemo, useState } from 'react';
import { ChevronDown, Printer, UserX, UserRound, History as HistoryIcon } from 'lucide-react';
import { categories, currentCenter, currentProfile } from '@/lib/mock-data';
import { useData } from '@/lib/store';
import { donationDetails, type DonationDetail } from '@/lib/stats';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';
import { Button, Card, Badge, EmptyState } from '@/components/ui';
import { DonationReport } from '@/components/report/DonationReport';

/* ===========================================================================
   Historial y reporte (PRD §3.C). Tabla cronológica; cada fila se expande para
   ver el desglose entregado. "Generar reporte" arma el documento imprimible y
   lanza window.print() (CSS @media print oculta el resto y deja solo el reporte).
   ========================================================================== */

function DonationRow({ detail }: { detail: DonationDetail }) {
  const [open, setOpen] = useState(false);
  const { donation, items } = detail;
  const productCount = items.length;

  return (
    <li className="border-b border-line-soft last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 py-3 text-left"
      >
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            donation.is_anonymous ? 'bg-surface-3 text-muted' : 'bg-azul/12 text-azul-ink',
          )}
        >
          {donation.is_anonymous ? <UserX className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-body text-sm font-semibold text-ink">
            {donation.is_anonymous ? 'Anónimo' : donation.donor_name}
          </span>
          <span className="block font-body text-xs text-muted">
            {formatDateTime(donation.created_at)} · {productCount}{' '}
            {productCount === 1 ? 'producto' : 'productos'}
          </span>
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <div className="pb-3 pl-12">
          <ul className="flex flex-col gap-1.5">
            {items.map(({ item, categoryName }) => (
              <li key={item.id} className="flex items-center justify-between gap-3 font-body text-sm">
                <span className="text-body">
                  {item.product} <Badge tone="neutral" className="ml-1">{categoryName}</Badge>
                </span>
                <span className="font-display font-black tracking-snug text-ink">×{item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export function Historial() {
  const { donations, donationItems } = useData();
  const centerId = currentProfile.center_id;

  const details = useMemo(
    () => donationDetails(donations, donationItems, categories, centerId),
    [donations, donationItems, centerId],
  );

  const anonymous = details.filter((d) => d.donation.is_anonymous).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div>
          <h1 className="font-display text-h1 font-black tracking-tightest text-ink">Historial</h1>
          <p className="mt-1 font-body text-base text-body">
            {details.length} {details.length === 1 ? 'donante' : 'donantes'} · {anonymous} anónimos
          </p>
        </div>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => window.print()}
          leftIcon={<Printer className="h-4 w-4" />}
          disabled={details.length === 0}
        >
          Generar reporte
        </Button>
      </header>

      <div className="print:hidden">
        <Card>
          {details.length > 0 ? (
            <ul className="flex flex-col">
              {details.map((detail) => (
                <DonationRow key={detail.donation.id} detail={detail} />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<HistoryIcon className="h-6 w-6" />}
              title="Sin donaciones todavía"
              description="Cuando registres donaciones aparecerán aquí en orden cronológico."
            />
          )}
        </Card>
      </div>

      {/* Reporte: oculto en pantalla, visible solo al imprimir. */}
      <div className="hidden print:block">
        <DonationReport
          centerName={currentCenter.name}
          organization={currentCenter.organization}
          generatedAt={new Date()}
          details={details}
          categories={categories}
        />
      </div>
    </div>
  );
}
