import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Phone, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  COUNTRY_DIALS,
  DEFAULT_DIAL,
  isoToFlag,
  searchCountries,
  type CountryDial,
} from '@/lib/phone-codes';

export interface PhoneValue {
  /** Código de marcación con `+` (ej. "+58"). */
  dial: string;
  /** Número nacional tal como lo escribe el usuario. */
  number: string;
}

export const EMPTY_PHONE: PhoneValue = { dial: DEFAULT_DIAL, number: '' };

export interface PhoneFieldProps {
  label?: string;
  required?: boolean;
  value: PhoneValue;
  onChange: (value: PhoneValue) => void;
  error?: string;
  placeholder?: string;
  id?: string;
}

/**
 * Teléfono con selector de país buscable (por nombre, ISO o código) + input del
 * número. El primer país que coincide con `value.dial` define la bandera; varios
 * países comparten código (+1, +7), así que se muestra el primero de la lista.
 */
export function PhoneField({
  label,
  required,
  value,
  onChange,
  error,
  placeholder = '412 555 0142',
  id,
}: PhoneFieldProps) {
  const autoId = useId();
  const baseId = id ?? autoId;
  const errorId = `${baseId}-error`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo<CountryDial | undefined>(
    () => COUNTRY_DIALS.find((c) => c.dial === value.dial),
    [value.dial],
  );
  const results = useMemo(() => searchCountries(query), [query]);

  // Cerrar al hacer click fuera; enfocar el buscador al abrir.
  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function pick(c: CountryDial) {
    onChange({ ...value, dial: c.dial });
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="font-body text-sm font-semibold text-ink">
          {label}
          {required && <span className="text-danger-ink"> *</span>}
        </span>
      )}

      <div ref={rootRef} className="relative">
        <div
          className={cn(
            'flex h-control w-full items-stretch overflow-hidden rounded-pill border bg-surface',
            'focus-within:border-azul focus-within:shadow-ring-azul',
            error ? 'border-danger' : 'border-line',
          )}
        >
          {/* Selector de país */}
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex shrink-0 items-center gap-1.5 border-r border-line pl-4 pr-3 text-base text-ink focus-visible:outline-none"
          >
            <span aria-hidden className="text-lg leading-none">
              {selected ? isoToFlag(selected.iso2) : <Phone className="h-4 w-4" />}
            </span>
            <span className="font-semibold tabular-nums">{value.dial}</span>
            <ChevronDown
              aria-hidden
              className={cn('h-4 w-4 text-muted transition-transform', open && 'rotate-180')}
            />
          </button>

          {/* Número */}
          <input
            id={baseId}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={placeholder}
            value={value.number}
            onChange={(e) => onChange({ ...value, number: e.target.value })}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="min-w-0 flex-1 bg-transparent px-3 text-base text-ink placeholder:text-subtle focus-visible:outline-none"
          />
        </div>

        {open && (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border border-line bg-surface p-2 shadow-float">
            <div className="relative mb-2">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busca país o código…"
                className="h-9 w-full rounded-lg border border-line bg-surface-2 pl-9 pr-3 text-sm text-ink placeholder:text-subtle focus-visible:border-azul focus-visible:outline-none"
              />
            </div>
            <ul role="listbox" className="max-h-56 overflow-auto">
              {results.length === 0 ? (
                <li className="px-3 py-2 font-body text-sm text-muted">Sin resultados.</li>
              ) : (
                results.map((c) => (
                  <li key={c.iso2}>
                    <button
                      type="button"
                      onClick={() => pick(c)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-body text-sm text-ink hover:bg-surface-2',
                        c.dial === value.dial && 'bg-surface-2 font-semibold',
                      )}
                    >
                      <span aria-hidden className="text-lg leading-none">
                        {isoToFlag(c.iso2)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="shrink-0 tabular-nums text-muted">{c.dial}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      {error && (
        <p id={errorId} className="font-body text-xs font-semibold text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}
