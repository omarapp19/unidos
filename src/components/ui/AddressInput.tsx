import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchAddresses, type AddressSuggestion } from '@/lib/geo';

export interface AddressInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onSelect'> {
  label?: string;
  error?: string;
  hint?: string;
  hideLabel?: boolean;
  leadingIcon?: ReactNode;
  /** Callback al seleccionar una sugerencia: dirección legible + coordenadas. */
  onSelect?: (address: string, lat: number, lng: number) => void;
}

const DEBOUNCE_MS = 400;

/**
 * Input de dirección con autocomplete via Nominatim (OSM).
 * - Debounce 400 ms para no saturar la API.
 * - Aborta el request anterior con AbortController.
 * - Teclado: ↑/↓ navega, Enter selecciona, Esc/Tab cierra.
 * - Al seleccionar una sugerencia NO relanza la búsqueda (justSelectedRef).
 */
export function AddressInput({
  label,
  error,
  hint,
  hideLabel = false,
  leadingIcon,
  onSelect,
  id,
  className,
  disabled,
  value,
  onChange,
  ...props
}: AddressInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listboxId = `${inputId}-listbox`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();
  const justSelectedRef = useRef(false);

  // Debounce + búsqueda al escribir.
  useEffect(() => {
    const q = (value as string ?? '').trim();
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      setErrorState(null);
      return;
    }

    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    debounceRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setErrorState(null);
      try {
        const results = await searchAddresses(q, ctrl.signal);
        if (!ctrl.signal.aborted) {
          setSuggestions(results);
          setOpen(results.length > 0);
          setActiveIndex(-1);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        if (!ctrl.signal.aborted) {
          setSuggestions([]);
          setErrorState('No se pudieron cargar sugerencias. Revisa tu conexión o extensiones (AdBlock/Brave).');
          setOpen(true);
        }
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [value]);

  function selectSuggestion(s: AddressSuggestion) {
    justSelectedRef.current = true;
    setSuggestions([]);
    setOpen(false);
    setErrorState(null);
    onSelect?.(s.displayName, s.lat, s.lng);
    if (onChange) {
      const ev = { target: { value: s.displayName } } as ChangeEvent<HTMLInputElement>;
      onChange(ev);
    }
  }

  // Cerrar al click fuera.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Mantener opción activa visible.
  useEffect(() => {
    if (open && activeIndex >= 0) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, activeIndex]);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0) {
          const s = suggestions[activeIndex];
          if (s) selectSuggestion(s);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'font-body text-sm font-semibold text-ink',
            hideLabel && 'sr-only',
          )}
        >
          {label}
        </label>
      )}

      <div ref={rootRef} className="relative">
        <div className="relative">
          {/* Icono líder: spinner durante búsqueda, leadingIcon si se pasa, o MapPin por defecto */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          >
            {loading ? (
              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-azul border-t-transparent" />
            ) : leadingIcon ?? (
              <MapPin className="h-4 w-4" />
            )}
          </span>
          <input
            ref={inputRef}
            id={inputId}
            disabled={disabled}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={
              activeIndex >= 0 ? `${inputId}-opt-${activeIndex}` : undefined
            }
            aria-autocomplete="list"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            autoComplete="off"
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
            className={cn(
              'h-control w-full rounded-pill border bg-surface pl-11 pr-4 text-base text-ink',
              'placeholder:text-subtle',
              'transition focus-visible:shadow-ring-azul focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-70',
              error ? 'border-danger' : 'border-line focus-visible:border-azul',
              className,
            )}
            {...props}
          />
        </div>

        {open && (
          <ul
            role="listbox"
            id={listboxId}
            className={cn(
              'absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-auto',
              'rounded-xl border border-line bg-surface p-1.5 shadow-float',
              'origin-top animate-[selectIn_120ms_ease-out]',
            )}
          >
            {errorState ? (
              <li className="px-3 py-2.5 font-body text-xs font-semibold text-danger-ink">
                ⚠️ {errorState}
              </li>
            ) : suggestions.length === 0 ? (
              <li className="px-3 py-2.5 font-body text-sm text-muted">
                Sin resultados
              </li>
            ) : (
              suggestions.map((s, i) => {
                const isActive = i === activeIndex;
                return (
                  <li
                    key={`${s.lat}-${s.lng}-${i}`}
                    ref={(el) => { optionRefs.current[i] = el; }}
                    id={`${inputId}-opt-${i}`}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSuggestion(s);
                    }}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5',
                      'font-body text-sm text-ink',
                      isActive && 'bg-surface-2',
                    )}
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                    <span className="line-clamp-2">{s.displayName}</span>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>

      {error ? (
        <p id={errorId} className="font-body text-xs font-semibold text-danger-ink">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="font-body text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
