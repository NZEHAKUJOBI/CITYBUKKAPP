import {
  Bike, ClipboardList, Ellipsis, LayoutDashboard, LogOut, Menu, Store, Tags, Users, UtensilsCrossed, type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import logo from '../assets/logo_transparent.png';
import { useAdminAuth } from './auth';
import l from './AdminLayout.module.css';
import { cx, IconButton } from './ui';

interface NavItem { to: string; label: string; icon: LucideIcon; short?: string }

export const NAV: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, short: 'Home' },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/riders', label: 'Riders', icon: Bike },
  { to: '/admin/menu', label: 'Menu items', icon: UtensilsCrossed, short: 'Menu' },
  { to: '/admin/restaurants', label: 'Restaurants', icon: Store, short: 'Bukkas' },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/users', label: 'Users', icon: Users },
];

const BOTTOM = NAV.slice(0, 4);

export function AdminLayout() {
  const { session, logout } = useAdminAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setDrawerOpen(false), [location.pathname]);
  useEffect(() => {
    const prev = document.title;
    document.title = 'CityBukka Admin';
    return () => { document.title = prev; };
  }, []);

  const current = NAV.find((n) => location.pathname.startsWith(n.to));

  return (
    <div className={l.shell}>
      <header className={l.topbar}>
        <IconButton label="Open menu" onClick={() => setDrawerOpen(true)}><Menu size={20} /></IconButton>
        <img src={logo} alt="" />
        <strong>{current?.label ?? 'Admin'}</strong>
      </header>

      {drawerOpen && <div className={l.drawerBackdrop} onClick={() => setDrawerOpen(false)} />}

      <aside className={cx(l.sidebar, drawerOpen && l.sidebarOpen)} aria-label="Admin navigation">
        <div className={l.brand}>
          <img src={logo} alt="" />
          <div>
            <strong>City Bukka</strong>
            <small>Admin</small>
          </div>
        </div>
        <nav className={l.nav}>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cx(l.link, isActive && l.active)}>
              <Icon size={18} aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <div className={l.account}>
          <div>
            <strong>{session?.admin.name || 'Admin'}</strong>
            <small>{session?.admin.email}</small>
          </div>
          <IconButton label="Log out" onClick={logout}><LogOut size={18} /></IconButton>
        </div>
      </aside>

      <main className={l.main}>
        <Outlet />
      </main>

      <nav className={l.bottomBar} aria-label="Quick navigation">
        {BOTTOM.map(({ to, label, short, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cx(l.tab, isActive && l.tabActive)}>
            <Icon size={20} aria-hidden /> {short ?? label}
          </NavLink>
        ))}
        <button type="button" className={l.tab} onClick={() => setDrawerOpen(true)}>
          <Ellipsis size={20} aria-hidden /> More
        </button>
      </nav>
    </div>
  );
}
