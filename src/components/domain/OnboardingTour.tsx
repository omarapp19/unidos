import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  HeartHandshake,
  MapPin,
  Activity,
  Building2,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';

interface OnboardingTourProps {
  /** Permite forzar la apertura del modal desde afuera (por ejemplo, desde el Header) */
  open?: boolean;
  /** Callback al cerrar el onboarding */
  onClose?: () => void;
}

interface Slide {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  badge?: string;
}

export function OnboardingTour({ open: forcedOpen, onClose }: OnboardingTourProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const slides: Slide[] = [
    {
      title: '¡Bienvenido a Unidos!',
      subtitle: 'Coordinación de Centros de Acopio para Venezuela',
      description: 'Unimos esfuerzos civiles para coordinar la ayuda humanitaria de forma transparente, ágil y directa. Descubre cómo funciona la plataforma.',
      icon: <HeartHandshake className="h-12 w-12 text-rojo animate-bounce" />,
      gradient: 'from-rojo/10 via-amarillo/5 to-azul/10',
      badge: 'Venezuela Unida',
    },
    {
      title: 'Encuentra Centros de Acopio',
      subtitle: 'Búsqueda georreferenciada en tiempo real',
      description: 'Busca por zona o nombre y activa tu ubicación para que el sistema ordene los centros automáticamente desde el más cercano a ti. Visualízalos en el mapa interactivo.',
      icon: <MapPin className="h-12 w-12 text-azul animate-pulse" />,
      gradient: 'from-azul/15 to-transparent',
      badge: 'Mapa Inteligente',
    },
    {
      title: 'Insumos Críticos En Vivo',
      subtitle: 'Saber qué hace falta exactamente',
      description: 'Consulta en tiempo real qué insumos se necesitan con urgencia (alimentos, medicinas, cobijas). Los iconos inteligentes se adaptan automáticamente a lo que los administradores actualicen.',
      icon: <Activity className="h-12 w-12 text-warning animate-[pulse_1.5s_infinite]" />,
      gradient: 'from-amarillo/15 to-transparent',
      badge: 'Prioridades Claras',
    },
    {
      title: 'Gestión para Centros de Acopio',
      subtitle: 'Administración de inventarios y donaciones',
      description: '¿Eres administrador de un centro? Regístralo gratis para acceder a tu panel privado. Registra donaciones recibidas, visualiza estadísticas y actualiza tus necesidades al instante.',
      icon: <Building2 className="h-12 w-12 text-success" />,
      gradient: 'from-success/15 to-transparent',
      badge: 'Para Organizaciones',
    },
    {
      title: 'Búsqueda de Personas y Recursos',
      subtitle: 'Enlaces de ayuda humanitaria y emergencia',
      description: 'Accede a la sección de personas desaparecidas con enlaces y directorios directos a organismos oficiales como la Cruz Roja, ACNUR y portales de reportes de daños.',
      icon: <Users className="h-12 w-12 text-purple-600 dark:text-purple-400" />,
      gradient: 'from-purple-500/10 to-transparent',
      badge: 'Comunidad',
    },
  ];

  // Chequear localStorage al cargar si no está forzado
  useEffect(() => {
    if (forcedOpen === undefined) {
      const completed = localStorage.getItem('unidos_onboarding_completed');
      if (!completed) {
        setOpen(true);
      }
    } else {
      setOpen(forcedOpen);
      if (forcedOpen) {
        setCurrentStep(0);
      }
    }
  }, [forcedOpen]);

  // Manejar Escape y Teclas de Flechas para navegar
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight') {
        if (currentStep < slides.length - 1) {
          setCurrentStep((s) => s + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStep > 0) {
          setCurrentStep((s) => s - 1);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, currentStep]);

  // Enfocar el panel al abrir
  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
  }, [open]);

  const handleClose = () => {
    localStorage.setItem('unidos_onboarding_completed', 'true');
    setOpen(false);
    onClose?.();
  };

  const handleNext = () => {
    if (currentStep < slides.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  if (!open) return null;

  const activeSlide = slides[currentStep];
  if (!activeSlide) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Tour de Bienvenida"
    >
      {/* Overlay con blur moderno */}
      <button
        type="button"
        aria-label="Cerrar tour"
        onClick={handleClose}
        className="absolute inset-0 cursor-default bg-ink/65 backdrop-blur-md transition-all duration-300"
      />

      {/* Tarjeta del Onboarding */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-surface text-ink shadow-float outline-none border border-line-soft transition-all duration-300 scale-100'
        )}
      >
        {/* Cabecera con botón cerrar flotante */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar tour"
          className="absolute right-4 top-4 z-20 rounded-full p-2 text-muted transition hover:bg-surface-2 hover:text-ink focus-visible:shadow-ring-azul focus-visible:outline-none"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Zona de contenido con fondo gradiente del paso actual */}
        <div className={cn('relative flex flex-col items-center px-6 pb-6 pt-12 text-center bg-gradient-to-b transition-all duration-500', activeSlide.gradient)}>
          {activeSlide.badge && (
            <span className="mb-4 inline-flex items-center rounded-pill bg-azul-ink/10 px-3 py-1 font-display text-[10px] font-black uppercase tracking-wider text-azul-ink dark:text-azul select-none">
              {activeSlide.badge}
            </span>
          )}

          {/* Círculo contenedor del icono */}
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface shadow-md border border-line-soft transition-all duration-300">
            {activeSlide.icon}
          </div>

          <h2 className="mt-6 font-display text-h2 font-black tracking-snug text-ink px-4">
            {activeSlide.title}
          </h2>

          <h3 className="mt-2 font-display text-sm font-bold text-muted uppercase tracking-wider">
            {activeSlide.subtitle}
          </h3>
        </div>

        {/* Descripción detallada */}
        <div className="px-8 py-6 text-center">
          <p className="font-body text-sm leading-relaxed text-body min-h-[72px]">
            {activeSlide.description}
          </p>
        </div>

        {/* Barra de navegación inferior */}
        <div className="flex items-center justify-between border-t border-line-soft px-6 py-4 bg-surface-2/45">
          {/* Botón de Saltar (o Anterior si está avanzado) */}
          {currentStep > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Anterior
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-muted hover:text-ink"
            >
              Saltar
            </Button>
          )}

          {/* Indicador de pasos (Dots) */}
          <div className="flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Ir al paso ${idx + 1}`}
                className={cn(
                  'h-2.5 rounded-full transition-all duration-300',
                  idx === currentStep ? 'w-6 bg-azul' : 'w-2.5 bg-line hover:bg-muted/50'
                )}
              />
            ))}
          </div>

          {/* Botón de Siguiente o Finalizar */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleNext}
            rightIcon={currentStep < slides.length - 1 ? <ChevronRight className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          >
            {currentStep < slides.length - 1 ? 'Siguiente' : 'Comenzar'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
