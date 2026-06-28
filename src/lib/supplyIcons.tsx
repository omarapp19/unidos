/* ===========================================================================
   Catálogo compartido de iconos para los insumos críticos (`needed_supplies`).
   El superadmin/admin elige una `key` al crear/editar el insumo; se guarda en
   la columna `needed_supplies.icon`. El render público usa esa key; si la fila
   no tiene icono (datos antiguos), cae a una heurística por nombre.
   ========================================================================== */

import type { ReactNode } from 'react';
import {
  Stethoscope,
  TestTube,
  Pill,
  HeartPulse,
  GlassWater,
  Droplet,
  Apple,
  Shirt,
  Wrench,
  Boxes,
  type LucideIcon,
} from 'lucide-react';

export interface SupplyIconOption {
  key: string;
  label: string;
  Icon: LucideIcon;
  colorClass: string;
}

/** Opciones de icono disponibles en el selector (orden = orden en la UI). */
export const SUPPLY_ICONS: SupplyIconOption[] = [
  { key: 'medico', label: 'Médico', Icon: Stethoscope, colorClass: 'text-rojo' },
  { key: 'ampolla', label: 'Ampolla', Icon: TestTube, colorClass: 'text-azul' },
  { key: 'tableta', label: 'Tabletas', Icon: Pill, colorClass: 'text-amarillo' },
  { key: 'corazon', label: 'Salud', Icon: HeartPulse, colorClass: 'text-success' },
  { key: 'agua', label: 'Agua', Icon: GlassWater, colorClass: 'text-azul' },
  { key: 'higiene', label: 'Higiene', Icon: Droplet, colorClass: 'text-amarillo' },
  { key: 'alimento', label: 'Alimento', Icon: Apple, colorClass: 'text-success' },
  { key: 'ropa', label: 'Ropa', Icon: Shirt, colorClass: 'text-purple-600' },
  { key: 'herramienta', label: 'Herramienta', Icon: Wrench, colorClass: 'text-orange-600' },
  { key: 'caja', label: 'Otros', Icon: Boxes, colorClass: 'text-azul' },
];

const ICON_BY_KEY = new Map(SUPPLY_ICONS.map((o) => [o.key, o]));

/** Heurística por nombre para filas sin icono explícito (retrocompatibilidad). */
function guessIconKey(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('med') || n.includes('salud') || n.includes('sanit')) return 'medico';
  if (n.includes('ampoll') || n.includes('inyect')) return 'ampolla';
  if (n.includes('tablet') || n.includes('pastill') || n.includes('pild') || n.includes('medicament')) return 'tableta';
  if (n.includes('agua') || n.includes('hidrat')) return 'agua';
  if (n.includes('aliment') || n.includes('comida') || n.includes('enlat')) return 'alimento';
  if (n.includes('ropa') || n.includes('calzad') || n.includes('cobij') || n.includes('abrig')) return 'ropa';
  if (n.includes('herramient') || n.includes('pala') || n.includes('linterna') || n.includes('guante de trabajo')) return 'herramienta';
  if (n.includes('higien') || n.includes('jabon') || n.includes('pañal') || n.includes('dental')) return 'higiene';
  return 'corazon';
}

/**
 * Renderiza el icono de un insumo. Usa `iconKey` si es válido; si no, infiere
 * por `name`. `sizeClass` controla el tamaño (ej. 'h-5 w-5').
 */
export function renderSupplyIcon(
  iconKey: string | null | undefined,
  name: string,
  sizeClass = 'h-4 w-4',
): ReactNode {
  const opt = (iconKey && ICON_BY_KEY.get(iconKey)) || ICON_BY_KEY.get(guessIconKey(name))!;
  const Icon = opt.Icon;
  return <Icon className={`${sizeClass} shrink-0 ${opt.colorClass}`} />;
}

/**
 * Selector de icono: fila de botones, uno por opción del catálogo. `value` es la
 * key seleccionada (o null = ninguna, el render usará la heurística por nombre).
 */
export function SupplyIconPicker({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Icono del insumo">
      {SUPPLY_ICONS.map(({ key, label, Icon, colorClass }) => {
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            disabled={disabled}
            aria-pressed={selected}
            title={label}
            aria-label={label}
            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition disabled:opacity-50 ${
              selected
                ? 'border-azul bg-azul/10 ring-1 ring-azul'
                : 'border-line-soft bg-surface hover:border-azul/40'
            }`}
          >
            <Icon className={`h-5 w-5 ${colorClass}`} />
          </button>
        );
      })}
    </div>
  );
}
