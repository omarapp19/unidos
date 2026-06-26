import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '@/types';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';

/* ===========================================================================
   Guard por rol. Reusa el estado de sesión de AuthProvider. Bloquea rutas de
   superadmin: un admin de centro normal es redirigido a su panel.
   ========================================================================== */

export function RequireRole({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const { status, profile } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner label="Cargando…" />
      </div>
    );
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/admin/login" replace />;
  }
  if (profile?.role !== role) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}
