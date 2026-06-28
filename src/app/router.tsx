import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { PublicHome } from '@/pages/PublicHome';

/* ===========================================================================
   Rutas del MVP (PRD). Público sin login en `/`; panel privado bajo `/admin`.

   Optimización de carga: solo `PublicHome` (la landing, LCP en móvil) se
   importa de forma estática. El resto de páginas — y sus dependencias pesadas
   (Leaflet en el registro, vistas de admin/super) — se cargan por demanda con
   `React.lazy`, sacándolas del bundle inicial.
   ========================================================================== */

// Las páginas exportan componentes con nombre; `React.lazy` exige `default`.
const PersonasDesaparecidas = lazy(() =>
  import('@/pages/PersonasDesaparecidas').then((m) => ({ default: m.PersonasDesaparecidas })),
);
const AyudaCategoria = lazy(() =>
  import('@/pages/AyudaCategoria').then((m) => ({ default: m.AyudaCategoria })),
);
const AdminLogin = lazy(() =>
  import('@/pages/AdminLogin').then((m) => ({ default: m.AdminLogin })),
);
const CenterRegister = lazy(() =>
  import('@/pages/CenterRegister').then((m) => ({ default: m.CenterRegister })),
);
const AdminLayout = lazy(() =>
  import('@/components/layout/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);
const Dashboard = lazy(() =>
  import('@/pages/admin/Dashboard').then((m) => ({ default: m.Dashboard })),
);
const Donaciones = lazy(() =>
  import('@/pages/admin/Donaciones').then((m) => ({ default: m.Donaciones })),
);
const Historial = lazy(() =>
  import('@/pages/admin/Historial').then((m) => ({ default: m.Historial })),
);
const SuperLayout = lazy(() =>
  import('@/components/layout/SuperLayout').then((m) => ({ default: m.SuperLayout })),
);
const RequireRole = lazy(() =>
  import('@/components/layout/RequireRole').then((m) => ({ default: m.RequireRole })),
);
const SuperCenters = lazy(() =>
  import('@/pages/super/SuperCenters').then((m) => ({ default: m.SuperCenters })),
);
const SuperCategories = lazy(() =>
  import('@/pages/super/SuperCategories').then((m) => ({ default: m.SuperCategories })),
);
const SuperSupplies = lazy(() =>
  import('@/pages/super/SuperSupplies').then((m) => ({ default: m.SuperSupplies })),
);
const SuperHelpResources = lazy(() =>
  import('@/pages/super/SuperHelpResources').then((m) => ({ default: m.SuperHelpResources })),
);

/** Envuelve un elemento perezoso con un fallback de carga centrado. */
function L(node: ReactNode): ReactNode {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner label="Cargando…" />
        </div>
      }
    >
      {node}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: <PublicHome /> },
  { path: '/personas-desaparecidas', element: L(<PersonasDesaparecidas />) },
  { path: '/ayuda/:categoryId', element: L(<AyudaCategoria />) },
  { path: '/admin/login', element: L(<AdminLogin />) },
  { path: '/registro', element: L(<CenterRegister />) },
  {
    path: '/admin',
    element: L(<AdminLayout />),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: L(<Dashboard />) },
      { path: 'donaciones', element: L(<Donaciones />) },
      { path: 'historial', element: L(<Historial />) },
    ],
  },
  {
    path: '/admin/super',
    element: L(
      <RequireRole role="superadmin">
        <SuperLayout />
      </RequireRole>,
    ),
    children: [
      { index: true, element: <Navigate to="/admin/super/centros" replace /> },
      { path: 'centros', element: L(<SuperCenters />) },
      { path: 'categorias', element: L(<SuperCategories />) },
      { path: 'insumos', element: L(<SuperSupplies />) },
      { path: 'recursos', element: L(<SuperHelpResources />) },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
