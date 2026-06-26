import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ApiError } from '@/lib/api/errors';
import { Spinner } from './Spinner';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

export interface QueryBoundaryProps {
  loading: boolean;
  error: ApiError | null;
  /** Reintenta la consulta fallida. */
  onRetry?: () => void;
  /** Mensaje del spinner mientras carga. */
  loadingLabel?: string;
  children: ReactNode;
}

/**
 * Envoltorio de estado para consultas: muestra spinner mientras carga, una
 * tarjeta de error con botón "Reintentar" si falla, o el contenido si todo va
 * bien. Centraliza el manejo de carga/error de las vistas (DRY).
 */
export function QueryBoundary({
  loading,
  error,
  onRetry,
  loadingLabel = 'Cargando…',
  children,
}: QueryBoundaryProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner label={loadingLabel} />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-6 w-6" />}
        title="No pudimos cargar la información"
        description={error.message}
        action={
          onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          ) : undefined
        }
      />
    );
  }

  return <>{children}</>;
}
