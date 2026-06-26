import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, Boxes, Tag, Layers, PackagePlus } from 'lucide-react';
import { categories, currentCenter, currentProfile } from '@/lib/mock-data';
import { useData } from '@/lib/store';
import {
  centerMetricsForDay,
  categoryTotals,
  topCategory,
  totalQuantityForCenter,
} from '@/lib/stats';
import { Button, Card } from '@/components/ui';
import { CenterStatusBadge } from '@/components/ui/Badge';
import { StatWidget, Donut } from '@/components/domain';

/** Colores de marca para las mini barras del mosaico. */
const BAR_FILL = ['bg-azul', 'bg-amarillo', 'bg-rojo', 'bg-success'] as const;

/* ===========================================================================
   Dashboard del centro (PRD §3.A · Propuesta 02 "Vista B").
   - 4 métricas: donantes hoy, productos recibidos, más donado, categorías activas.
   - Donut identificados vs anónimos (acumulado del centro).
   - Mosaico de categorías con cantidades exactas (privado) + mini barra.
   ========================================================================== */

const TODAY = new Date('2026-06-25T12:00:00');

export function Dashboard() {
  const { donations, donationItems } = useData();
  const centerId = currentProfile.center_id;

  const metrics = useMemo(
    () => centerMetricsForDay(donations, centerId, TODAY),
    [donations, centerId],
  );

  const totals = useMemo(
    () =>
      categoryTotals(donations, donationItems, categories, centerId).filter(
        (t) => t.quantity > 0,
      ),
    [donations, donationItems, centerId],
  );

  const top = useMemo(
    () => topCategory(donations, donationItems, categories, centerId),
    [donations, donationItems, centerId],
  );

  const totalProducts = useMemo(
    () => totalQuantityForCenter(donations, donationItems, centerId),
    [donations, donationItems, centerId],
  );

  // Identificados vs anónimos: acumulado de todas las donaciones del centro.
  const { identified, anonymous, pctIdentified } = useMemo(() => {
    const mine = donations.filter((d) => d.center_id === centerId);
    const anon = mine.filter((d) => d.is_anonymous).length;
    const ident = mine.length - anon;
    const pct = mine.length === 0 ? 0 : Math.round((ident / mine.length) * 100);
    return { identified: ident, anonymous: anon, pctIdentified: pct };
  }, [donations, centerId]);

  // Máximo para escalar las mini barras del mosaico.
  const maxQty = totals[0]?.quantity ?? 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-body text-2xs font-bold uppercase tracking-eyebrow text-subtle">
            Tu centro
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-h1 font-black tracking-tightest text-ink">
              {currentCenter.name}
            </h1>
            <CenterStatusBadge status={currentCenter.status} />
          </div>
        </div>
        <Link to="/admin/donaciones">
          <Button variant="primary" size="lg" leftIcon={<PackagePlus className="h-4 w-4" />}>
            Registrar donación
          </Button>
        </Link>
      </header>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatWidget icon={<Users className="h-5 w-5" />} value={metrics.donorsToday} label="Donantes hoy" />
        <StatWidget
          icon={<Boxes className="h-5 w-5" />}
          value={totalProducts.toLocaleString('es-VE')}
          label="Productos recibidos"
        />
        <StatWidget
          icon={<Tag className="h-5 w-5" />}
          value={<span className="text-azul">{top ? top.category.name : '—'}</span>}
          label="Más donado"
        />
        <StatWidget icon={<Layers className="h-5 w-5" />} value={totals.length} label="Categorías activas" />
      </div>

      {/* Donut + mosaico */}
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card className="flex flex-col gap-4">
          <h2 className="font-body text-2xs font-bold uppercase tracking-eyebrow text-subtle">
            Identificados vs anónimos
          </h2>
          <Donut
            centerValue={`${pctIdentified}%`}
            centerLabel="con nombre"
            segments={[
              { value: identified, color: 'var(--color-azul)', label: 'Identificados' },
              { value: anonymous, color: 'var(--color-amarillo)', label: 'Anónimos' },
            ]}
          />
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Boxes className="h-5 w-5 text-azul" aria-hidden />
            <h2 className="font-display text-h3 font-black tracking-snug text-ink">
              Mosaico de categorías
            </h2>
          </div>
          <p className="mb-4 font-body text-sm text-body">
            Cantidades exactas de tu centro. Privado — el público nunca ve estos números.
          </p>
          {totals.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {totals.map((t, i) => (
                <div
                  key={t.category.id}
                  className="flex flex-col gap-2 rounded-lg border border-line-soft bg-surface-2 p-3"
                >
                  <p className="font-display text-h2 font-black leading-none tracking-tightest text-ink">
                    {t.quantity.toLocaleString('es-VE')}
                  </p>
                  <p className="font-body text-xs text-body">{t.category.name}</p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-bone">
                    <div
                      className={`h-full rounded-full ${BAR_FILL[i % BAR_FILL.length]}`}
                      style={{ width: `${(t.quantity / maxQty) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-body text-sm text-muted">Aún no hay donaciones registradas.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
