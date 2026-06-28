import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicHome } from '@/pages/PublicHome';
import { PersonasDesaparecidas } from '@/pages/PersonasDesaparecidas';
import { AyudaCategoria } from '@/pages/AyudaCategoria';
import { AdminLogin } from '@/pages/AdminLogin';
import { CenterRegister } from '@/pages/CenterRegister';
import { AcceptInvitation } from '@/pages/AcceptInvitation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Dashboard } from '@/pages/admin/Dashboard';
import { Donaciones } from '@/pages/admin/Donaciones';
import { Historial } from '@/pages/admin/Historial';
import { SuperLayout } from '@/components/layout/SuperLayout';
import { RequireRole } from '@/components/layout/RequireRole';
import { SuperCenters } from '@/pages/super/SuperCenters';
import { SuperCategories } from '@/pages/super/SuperCategories';
import { SuperSupplies } from '@/pages/super/SuperSupplies';
import { SuperHelpResources } from '@/pages/super/SuperHelpResources';

/* ===========================================================================
   Rutas del MVP (PRD). Público sin login en `/`; panel privado bajo `/admin`.
   Auth real (Supabase) llega después: hoy el login es mock y no hay guard.
   ========================================================================== */

export const router = createBrowserRouter([
  { path: '/', element: <PublicHome /> },
  { path: '/personas-desaparecidas', element: <PersonasDesaparecidas /> },
  { path: '/ayuda/:categoryId', element: <AyudaCategoria /> },
  { path: '/admin/login', element: <AdminLogin /> },
  { path: '/registro', element: <CenterRegister /> },
  { path: '/admin/aceptar-invitacion', element: <AcceptInvitation /> },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'donaciones', element: <Donaciones /> },
      { path: 'historial', element: <Historial /> },
    ],
  },
  {
    path: '/admin/super',
    element: (
      <RequireRole role="superadmin">
        <SuperLayout />
      </RequireRole>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/super/centros" replace /> },
      { path: 'centros', element: <SuperCenters /> },
      { path: 'categorias', element: <SuperCategories /> },
      { path: 'insumos', element: <SuperSupplies /> },
      { path: 'recursos', element: <SuperHelpResources /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
