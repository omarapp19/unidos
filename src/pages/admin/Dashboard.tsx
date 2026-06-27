import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Boxes, Tag, Layers, PackagePlus, Trash2, AlertCircle, PlusCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@/lib/hooks/useQuery';
import { getCategories } from '@/lib/api/categories';
import { getCenterDonations } from '@/lib/api/donations';
import {
  centerMetricsForDay,
  categoryTotals,
  topCategory,
  totalQuantityForCenter,
} from '@/lib/stats';
import { Button, Card, QueryBoundary } from '@/components/ui';
import { CenterStatusBadge } from '@/components/ui/Badge';
import { StatWidget, Donut } from '@/components/domain';
import { getNeededSupplies, addNeededSupply, deleteNeededSupply, type NeededSupply } from '@/lib/api/supplies';

/** Colores de marca para las mini barras del mosaico. */
const BAR_FILL = ['bg-azul', 'bg-amarillo', 'bg-rojo', 'bg-success'] as const;

/* ===========================================================================
   Dashboard del centro (PRD §3.A · Propuesta 02 "Vista B").
   - 4 métricas: donantes hoy, productos recibidos, más donado, categorías activas.
   - Donut identificados vs anónimos (acumulado del centro).
   - Mosaico de categorías con cantidades exactas (privado) + mini barra.
   ========================================================================== */

export function Dashboard() {
  const { profile, center } = useAuth();
  const centerId = profile?.center_id ?? '';

  const categoriesQuery = useQuery(getCategories, []);
  const donationsQuery = useQuery(
    () => getCenterDonations(centerId),
    [centerId],
    centerId !== '',
  );

  const categories = categoriesQuery.data ?? [];
  const donations = donationsQuery.data?.donations ?? [];
  const donationItems = donationsQuery.data?.items ?? [];

  const metrics = useMemo(
    () => centerMetricsForDay(donations, centerId, new Date()),
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
              {center?.name ?? 'Tu centro'}
            </h1>
            {center && <CenterStatusBadge status={center.status} />}
          </div>
        </div>
        <Link to="/admin/donaciones">
          <Button variant="primary" size="lg" leftIcon={<PackagePlus className="h-4 w-4" />}>
            Registrar donación
          </Button>
        </Link>
      </header>

      <QueryBoundary
        loading={donationsQuery.loading || categoriesQuery.loading}
        error={donationsQuery.error ?? categoriesQuery.error}
        onRetry={() => {
          donationsQuery.refetch();
          categoriesQuery.refetch();
        }}
        loadingLabel="Cargando tu panel…"
      >
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

      {centerId && <CenterSuppliesManager centerId={centerId} />}
      </QueryBoundary>
    </div>
  );
}

function CenterSuppliesManager({ centerId }: { centerId: string }) {
  const [supplies, setSupplies] = useState<NeededSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadSupplies() {
    setLoading(true);
    try {
      const data = await getNeededSupplies(centerId);
      setSupplies(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Error al cargar los insumos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSupplies();
  }, [centerId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newItem.trim();
    if (!name) return;
    setSubmitting(true);
    setError(null);
    try {
      const added = await addNeededSupply(name, centerId);
      setSupplies((prev) => [...prev, added]);
      setNewItem('');
    } catch (err: any) {
      setError(err?.message ?? 'Error al guardar el insumo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este insumo?')) return;
    setError(null);
    try {
      await deleteNeededSupply(id);
      setSupplies((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setError(err?.message ?? 'Error al eliminar el insumo.');
    }
  }

  return (
    <Card className="flex flex-col gap-4 border-warning/40 shadow-sm bg-surface">
      <div className="flex items-center justify-between border-b border-line-soft pb-3">
        <div>
          <h2 className="font-display text-h3 font-black tracking-snug text-ink flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-warning-ink" />
            Lo que tu centro necesita
          </h2>
          <p className="text-xs text-muted font-body mt-0.5">
            Estos insumos aparecen en tu ficha pública para orientar a los donantes.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-danger-bg p-3 text-sm text-danger-ink">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="font-body text-xs">{error}</p>
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          placeholder="Ej: Insumos médicos, Ampollas, Tabletas..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          className="flex-1 rounded-pill border border-line bg-surface px-4 py-2 text-xs font-body text-ink placeholder:text-muted focus:border-azul focus:outline-none"
          disabled={submitting}
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={submitting}
          className="whitespace-nowrap"
        >
          Agregar
        </Button>
      </form>

      {loading ? (
        <p className="text-xs text-muted font-body">Cargando insumos...</p>
      ) : supplies.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {supplies.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1.5 rounded-pill bg-warning-bg px-3 py-1 font-body text-2xs font-bold text-warning-ink"
            >
              {item.name}
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="hover:text-danger hover:scale-110 transition shrink-0"
                aria-label={`Eliminar ${item.name}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted font-body">No hay insumos críticos definidos.</p>
      )}
    </Card>
  );
}
