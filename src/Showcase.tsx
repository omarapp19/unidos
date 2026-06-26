import { useState, type ReactNode } from 'react';
import { Sun, Moon, Users, UserX, Droplet, Map, Plus } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import type { Category } from '@/types';
import {
  Button,
  Badge,
  CenterStatusBadge,
  RoleBadge,
  Card,
  Input,
  Select,
  Spinner,
  EmptyState,
} from '@/components/ui';
import {
  CenterCard,
  DonationFormRow,
  StatWidget,
  CategoryBar,
  type DonationRowValue,
} from '@/components/domain';

/* ===========================================================================
   Página de revisión visual (no entra al MVP). Renderiza todos los componentes
   con datos de ejemplo y un botón para alternar tema claro/oscuro.
   ========================================================================== */

const CATEGORIES: Category[] = [
  { id: 'c1', name: 'Agua', unit: 'litros' },
  { id: 'c2', name: 'Granos', unit: 'kg' },
  { id: 'c3', name: 'Enlatados', unit: 'unidades' },
  { id: 'c4', name: 'Insumos Médicos', unit: 'unidades' },
];

/** Sección con título para agrupar variantes. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-h2 font-black tracking-snug text-ink">{title}</h2>
      {children}
    </section>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="md"
      onClick={toggleTheme}
      leftIcon={
        theme === 'dark' ? (
          <Sun aria-hidden className="h-4 w-4" />
        ) : (
          <Moon aria-hidden className="h-4 w-4" />
        )
      }
    >
      {theme === 'dark' ? 'Claro' : 'Oscuro'}
    </Button>
  );
}

export function Showcase() {
  // Estado mínimo para que las filas de donación y los inputs sean interactivos.
  const [rows, setRows] = useState<DonationRowValue[]>([
    { categoryId: 'c1', product: 'Caja de agua', quantity: '2' },
  ]);
  const [name, setName] = useState('');

  const updateRow = (i: number, value: DonationRowValue) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? value : r)));
  const addRow = () =>
    setRows((prev) => [...prev, { categoryId: '', product: '', quantity: '' }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="min-h-screen bg-bg">
      {/* Header pegajoso con el toggle de tema */}
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div>
            <p className="font-body text-2xs font-bold uppercase tracking-eyebrow text-subtle">
              Unidos · Design System
            </p>
            <h1 className="font-display text-h2 font-black tracking-snug text-ink">
              Galería de componentes
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-5 py-10">
        {/* ---------- Buttons ---------- */}
        <Section title="Button">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Registrar donación</Button>
            <Button variant="secondary">Confianza</Button>
            <Button variant="ghost">Cancelar</Button>
            <Button variant="danger">Eliminar</Button>
            <Button variant="primary" loading>
              Guardando
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">sm</Button>
            <Button size="md">md</Button>
            <Button size="lg">lg</Button>
            <Button variant="secondary" disabled>
              disabled
            </Button>
          </div>
        </Section>

        {/* ---------- Badges ---------- */}
        <Section title="Badge">
          <div className="flex flex-wrap items-center gap-3">
            <CenterStatusBadge status="receiving" />
            <CenterStatusBadge status="full" />
            <CenterStatusBadge status="closed" />
            <RoleBadge role="admin" />
            <RoleBadge role="superadmin" />
            <Badge tone="neutral">Neutral</Badge>
            <Badge tone="azul">Azul</Badge>
          </div>
        </Section>

        {/* ---------- Inputs / Select ---------- */}
        <Section title="Input · Select">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nombre del donante"
              placeholder="Opcional — vacío = anónimo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              hint="Si se deja vacío se registra como anónimo."
            />
            <Input label="Con error" placeholder="Cantidad" error="Debe ser mayor a 0." />
            <Select
              label="Categoría"
              placeholder="Selecciona una categoría"
              options={CATEGORIES.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Input label="Deshabilitado" placeholder="No editable" disabled />
          </div>
        </Section>

        {/* ---------- Spinner / EmptyState ---------- */}
        <Section title="Spinner · EmptyState">
          <div className="flex items-center gap-6">
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </div>
          <Card>
            <EmptyState
              icon={<Map aria-hidden className="h-7 w-7" />}
              title="No hay centros cerca"
              description="No encontramos centros de acopio activos en esta zona. Prueba ampliar el mapa."
              action={<Button variant="secondary">Ver todo el mapa</Button>}
            />
          </Card>
        </Section>

        {/* ---------- StatWidget ---------- */}
        <Section title="StatWidget">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <StatWidget
              icon={<Users aria-hidden className="h-5 w-5" />}
              value="47"
              label="Donantes hoy"
              trend={{ direction: 'up', label: '+12 vs. ayer' }}
            />
            <StatWidget
              icon={<UserX aria-hidden className="h-5 w-5" />}
              value="18"
              label="Anónimos"
            />
            <StatWidget
              icon={<Droplet aria-hidden className="h-5 w-5" />}
              value="450 L"
              label="Agua acumulada"
              trend={{ direction: 'down', label: '-5%' }}
            />
          </div>
        </Section>

        {/* ---------- CategoryBar ---------- */}
        <Section title="CategoryBar">
          <Card className="flex flex-col gap-4">
            <CategoryBar label="Granos" percentage={40} color="amarillo" />
            <CategoryBar label="Agua" percentage={28} color="azul" />
            <CategoryBar label="Enlatados" percentage={20} color="success" />
            <CategoryBar label="Insumos Médicos" percentage={12} color="rojo" />
            <CategoryBar label="Agua (con cantidad)" percentage={28} valueText="450 L" color="azul" />
          </Card>
        </Section>

        {/* ---------- CenterCard ---------- */}
        <Section title="CenterCard">
          <div className="grid gap-4 md:grid-cols-2">
            <CenterCard
              highlighted
              center={{
                name: 'Centro Cruz Roja — Chacao',
                address: 'Av. Francisco de Miranda, Caracas',
                schedule: 'Lun–Sáb · 8:00 a.m. – 5:00 p.m.',
                status: 'receiving',
                organization: 'Cruz Roja Venezolana',
                is_verified: true,
                lat: 10.498,
                lng: -66.853,
              }}
              urgentSupplies={['Agua', 'Insumos Médicos']}
            />
            <CenterCard
              compact
              center={{
                name: 'Parroquia San José',
                address: 'Calle Real de Sabana Grande',
                schedule: 'Todos los días · 9:00 a.m. – 1:00 p.m.',
                status: 'full',
                organization: 'Caritas',
                is_verified: false,
                lat: 10.49,
                lng: -66.88,
              }}
              urgentSupplies={['Granos']}
            />
          </div>
        </Section>

        {/* ---------- DonationFormRow ---------- */}
        <Section title="DonationFormRow (formulario de recepción)">
          <Card className="flex flex-col gap-4">
            <Input
              label="Nombre del donante"
              placeholder="Opcional — vacío = anónimo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex flex-col gap-3">
              {rows.map((row, i) => (
                <DonationFormRow
                  key={i}
                  index={i}
                  value={row}
                  categories={CATEGORIES}
                  removable={rows.length > 1}
                  onChange={(v) => updateRow(i, v)}
                  onRemove={() => removeRow(i)}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="ghost"
                onClick={addRow}
                leftIcon={<Plus aria-hidden className="h-4 w-4" />}
              >
                Añadir producto
              </Button>
              <Button variant="primary">Registrar donación</Button>
            </div>
          </Card>
        </Section>
      </main>
    </div>
  );
}
