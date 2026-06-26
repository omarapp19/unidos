import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  /** Controla la visibilidad. */
  open: boolean;
  /** Cierre solicitado (overlay, botón × o tecla Esc). */
  onClose: () => void;
  /** Título accesible mostrado en la cabecera. */
  title: string;
  /** Subtítulo opcional bajo el título. */
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Diálogo modal accesible (presentacional). Se renderiza en un portal al `body`,
 * cierra con Esc / clic en el overlay, bloquea el scroll de fondo y devuelve el foco
 * al panel. Mobile-first: hoja inferior en celular, tarjeta centrada en desktop.
 */
export function Modal({ open, onClose, title, subtitle, children, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Esc para cerrar + bloqueo del scroll de fondo mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Overlay */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/50 backdrop-blur-sm"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden bg-surface text-ink shadow-card outline-none',
          'rounded-t-2xl sm:max-w-lg sm:rounded-2xl',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line-soft p-5">
          <div className="min-w-0">
            <h2 className="font-display text-h3 font-black tracking-snug text-ink">{title}</h2>
            {subtitle && <div className="mt-0.5 font-body text-xs text-muted">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-ink focus-visible:shadow-ring-azul focus-visible:outline-none"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="scrollbar-thin overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
