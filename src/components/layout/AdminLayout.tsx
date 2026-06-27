import { useState } from 'react';
import { NavLink, Outlet, Link, Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PackagePlus,
  History,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button, Spinner } from '@/components/ui';
import { RoleBadge } from '@/components/ui/Badge';

/* ===========================================================================
   Layout del panel privado (PRD Módulo 3). Sidebar en desktop, menú colapsable
   en mobile. Renderiza la sección activa vía <Outlet>. Cabecera con el centro
   que gestiona el admin logueado (mock currentProfile/currentCenter).
   ========================================================================== */

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/donaciones', label: 'Recepción', icon: PackagePlus },
  { to: '/admin/historial', label: 'Historial', icon: History },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 font-body text-sm font-semibold transition',
              isActive
                ? 'bg-rojo text-white'
                : 'text-body hover:bg-surface-2 hover:text-ink',
            )
          }
        >
          <Icon className="h-5 w-5 shrink-0" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AdminLayout() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { status, profile, center, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const centerName = center?.name ?? 'Tu centro';
  const adminName = profile?.full_name ?? 'Administrador';

  // Guard de ruta: espera la resolución de la sesión; si no hay, va al login.
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner label="Cargando tu panel…" />
      </div>
    );
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/admin/login" replace />;
  }
  if (profile?.role === 'superadmin') {
    return <Navigate to="/admin/super" replace />;
  }

  const Brand = (
    <Link to="/admin/dashboard" className="flex items-center gap-2">
      <span className="logo-badge flex h-8 w-8 items-center justify-center rounded-md">
        <img
          src="/logo-mark.png"
          alt="Centros de Acopio Venezuela"
          className="h-full w-full object-contain"
          width={32}
          height={32}
        />
      </span>
      <span className="font-display text-h3 font-black tracking-snug text-ink">Unidos</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-bg lg:flex">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line-soft bg-surface p-4 lg:flex">
        <div className="mb-6">{Brand}</div>
        <div className="mb-4 rounded-lg bg-surface-2 p-3">
          <p className="font-display text-sm font-black tracking-snug text-ink">
            {centerName}
          </p>
          <p className="mt-0.5 font-body text-xs text-muted">{adminName}</p>
          {profile?.role && (
            <div className="mt-2">
              <RoleBadge role={profile.role} />
            </div>
          )}
        </div>
        <NavItems />
        <div className="mt-auto flex flex-col gap-2 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            leftIcon={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          >
            {theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} leftIcon={<LogOut className="h-4 w-4" />}>
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Topbar mobile */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line-soft bg-surface px-4 py-3 lg:hidden">
          {Brand}
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-ink"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {mobileOpen && (
          <div className="border-b border-line-soft bg-surface px-4 py-4 lg:hidden">
            <div className="mb-3 rounded-lg bg-surface-2 p-3">
              <p className="font-display text-sm font-black text-ink">{centerName}</p>
              <p className="font-body text-xs text-muted">{adminName}</p>
            </div>
            <NavItems onNavigate={() => setMobileOpen(false)} />
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" size="sm" onClick={toggleTheme} className="flex-1"
                leftIcon={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}>
                {theme === 'dark' ? 'Claro' : 'Oscuro'}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="flex-1"
                leftIcon={<LogOut className="h-4 w-4" />}>
                Salir
              </Button>
            </div>
          </div>
        )}

        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
