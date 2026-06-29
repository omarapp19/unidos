import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { Building2, Tags, LogOut, Menu, X, Sun, Moon, Boxes, Link2, KeyRound } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui';
import { RoleBadge } from '@/components/ui/Badge';

/* ===========================================================================
   Layout del panel de superadmin. Rutas separadas del panel de centro; el
   acceso lo controla <RequireRole role="superadmin"> en el router.
   ========================================================================== */

const NAV = [
  { to: '/admin/super/centros', label: 'Centros', icon: Building2 },
  { to: '/admin/super/categorias', label: 'Categorías', icon: Tags },
  { to: '/admin/super/insumos', label: 'Insumos Críticos', icon: Boxes },
  { to: '/admin/super/recursos', label: 'Recursos de Ayuda', icon: Link2 },
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
              isActive ? 'bg-rojo text-white' : 'text-body hover:bg-surface-2 hover:text-ink',
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

export function SuperLayout() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const Brand = (
    <Link to="/admin/super/centros" className="flex items-center gap-2">
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
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line-soft bg-surface p-4 lg:flex">
        <div className="mb-6">{Brand}</div>
        <div className="mb-4 rounded-lg bg-surface-2 p-3">
          <p className="font-display text-sm font-black tracking-snug text-ink">
            {profile?.full_name ?? 'Superadmin'}
          </p>
          <div className="mt-2">
            <RoleBadge role="superadmin" />
          </div>
        </div>
        <NavItems />
        <div className="mt-auto flex flex-col gap-2 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/cuenta')}
            leftIcon={<KeyRound className="h-4 w-4" />}
          >
            Cambiar contraseña
          </Button>
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
            <NavItems onNavigate={() => setMobileOpen(false)} />
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full"
              onClick={() => {
                setMobileOpen(false);
                navigate('/admin/cuenta');
              }}
              leftIcon={<KeyRound className="h-4 w-4" />}
            >
              Cambiar contraseña
            </Button>
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
