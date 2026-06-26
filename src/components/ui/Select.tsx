import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  error?: string;
  hint?: string;
  hideLabel?: boolean;
  options: SelectOption[];
  /** Texto cuando no hay valor seleccionado. */
  placeholder?: string;
  /** Valor controlado. */
  value?: string;
  /** Valor inicial (modo no controlado). */
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

/**
 * Select accesible custom (ARIA combobox + listbox). Reemplaza al <select>
 * nativo para poder estilar el menú como extensión del input (pill + sombra
 * del DS), imposible con el dropdown nativo del sistema operativo.
 *
 * Teclado: ↑/↓ mueve, Enter/Espacio selecciona, Esc cierra, Home/End saltan,
 * y typeahead por inicial. Cierra al hacer click fuera o perder foco.
 */
export function Select({
  label,
  error,
  hint,
  hideLabel = false,
  options,
  placeholder = 'Selecciona…',
  value,
  defaultValue,
  onChange,
  disabled = false,
  id,
  name,
  className,
}: SelectProps) {
  const autoId = useId();
  const baseId = id ?? autoId;
  const labelId = `${baseId}-label`;
  const listboxId = `${baseId}-listbox`;
  const errorId = `${baseId}-error`;
  const hintId = `${baseId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  // Soporta controlado (value) y no controlado (estado interno).
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? '');
  const selected = isControlled ? value : internal;

  const [open, setOpen] = useState(false);
  // Opción resaltada con el teclado (no necesariamente seleccionada).
  const [activeIndex, setActiveIndex] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const typeahead = useRef({ query: '', timer: 0 });

  const selectedOption = options.find((o) => o.value === selected);

  function commit(next: string) {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }

  function openMenu() {
    if (disabled) return;
    setOpen(true);
    const idx = options.findIndex((o) => o.value === selected);
    setActiveIndex(idx >= 0 ? idx : 0);
  }

  function closeMenu(refocus = true) {
    setOpen(false);
    setActiveIndex(-1);
    if (refocus) triggerRef.current?.focus();
  }

  function selectIndex(idx: number) {
    const opt = options[idx];
    if (!opt) return;
    commit(opt.value);
    closeMenu();
  }

  // Cerrar al click fuera.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) closeMenu(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Mantener la opción activa a la vista.
  useEffect(() => {
    if (open && activeIndex >= 0) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, activeIndex]);

  function handleTypeahead(char: string) {
    window.clearTimeout(typeahead.current.timer);
    typeahead.current.query += char.toLowerCase();
    const q = typeahead.current.query;
    const idx = options.findIndex((o) => o.label.toLowerCase().startsWith(q));
    if (idx >= 0) {
      if (open) setActiveIndex(idx);
      else commit(options[idx]!.value);
    }
    typeahead.current.timer = window.setTimeout(() => {
      typeahead.current.query = '';
    }, 500);
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      } else if (e.key.length === 1) {
        handleTypeahead(e.key);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        selectIndex(activeIndex);
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu();
        break;
      case 'Tab':
        closeMenu(false);
        break;
      default:
        if (e.key.length === 1) handleTypeahead(e.key);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span
          id={labelId}
          className={cn(
            'font-body text-sm font-semibold text-ink',
            hideLabel && 'sr-only',
          )}
        >
          {label}
        </span>
      )}

      <div ref={rootRef} className="relative">
        {/* Valor real para envíos de formulario nativo. */}
        {name && <input type="hidden" name={name} value={selected} />}

        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-labelledby={label ? `${labelId} ${baseId}` : undefined}
          id={baseId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          onClick={() => (open ? closeMenu() : openMenu())}
          onKeyDown={onKeyDown}
          className={cn(
            'flex h-control w-full items-center justify-between gap-2 rounded-pill border bg-surface pl-4 pr-3 text-left text-base',
            'transition focus-visible:shadow-ring-azul focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-70',
            error ? 'border-danger' : 'border-line',
            open && !error && 'border-azul shadow-ring-azul',
            className,
          )}
        >
          <span className={cn('truncate', selectedOption ? 'text-ink' : 'text-subtle')}>
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              'h-4 w-4 shrink-0 text-muted transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>

        {open && (
          <ul
            role="listbox"
            id={listboxId}
            aria-labelledby={label ? labelId : undefined}
            aria-activedescendant={
              activeIndex >= 0 ? `${baseId}-opt-${activeIndex}` : undefined
            }
            className={cn(
              'absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-auto',
              'rounded-xl border border-line bg-surface p-1.5 shadow-float',
              // Entrada sutil, como extensión del input.
              'origin-top animate-[selectIn_120ms_ease-out]',
            )}
          >
            {options.map((opt, i) => {
              const isSelected = opt.value === selected;
              const isActive = i === activeIndex;
              return (
                <li
                  key={opt.value}
                  ref={(el) => {
                    optionRefs.current[i] = el;
                  }}
                  id={`${baseId}-opt-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => selectIndex(i)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5',
                    'font-body text-base text-ink',
                    isActive && 'bg-surface-2',
                    isSelected && 'font-semibold text-azul-ink',
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check aria-hidden className="h-4 w-4 shrink-0 text-azul" />}
                </li>
              );
            })}
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
