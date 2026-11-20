import { Heart, Receipt, ShoppingBag, Store, User } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';
import logo from '../assets/logo_transparent.png';
import { formatNaira } from '../lib/format';
import { useCart } from '../state/CartContext';
import { useUser } from '../state/UserContext';
import styles from './layout.module.css';

/**
 * Root wrapper. Historically this drew a phone frame on desktop; the app is now
 * fully responsive, so it is a plain full-viewport container. The name is kept
 * because App.tsx imports it.
 */
export function PhoneShell({ children }: { children: ReactNode }) {
  return <div className={styles.app}>{children}</div>;
}

/**
 * Standard screen: optional header, scrollable content, optional footer
 * (e.g. an "Add to bag" bar) pinned above the tab bar / bottom edge.
 */
export function Screen({ header, footer, children, className }: {
  header?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <div className={styles.screen}>
      {header}
      <main className={`${styles.content} ${className ?? ''}`}>{children}</main>
      {footer && (
        <div className={styles.footer}>
          <div className={styles.footerInner}>{footer}</div>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { to: '/', label: 'Explore', Icon: Store, end: true },
  { to: '/saved', label: 'Saved', Icon: Heart },
  { to: '/orders', label: 'Orders', Icon: Receipt, end: true },
  { to: '/bag', label: 'Bag', Icon: ShoppingBag },
  { to: '/profile', label: 'Profile', Icon: User },
] as const;

/**
 * The five main tabs. Phones and tablets get a bottom tab bar; from 900px the
 * desktop top navigation (rendered by <Splash>/AppFrame) takes over.
 */
export function TabLayout() {
  const { itemCount } = useCart();
  return (
    <div className={styles.tabs}>
      <div className={styles.tabContent}>
        <Outlet />
      </div>
      <nav className={styles.nav} aria-label="Main">
        <div className={styles.navInner}>
          {TABS.map(({ to, label, Icon, ...rest }) => (
            <NavLink key={to} to={to} end={'end' in rest} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}>
              {({ isActive }) => (
                <>
                  <span className={styles.navIcon}>
                    <Icon size={22} strokeWidth={isActive ? 2.4 : 2} fill={isActive && label !== 'Orders' ? 'currentColor' : 'none'} aria-hidden />
                    {label === 'Bag' && itemCount > 0 && (
                      <span className={styles.badge} aria-label={`${itemCount} items`}>{itemCount}</span>
                    )}
                  </span>
                  <span className={styles.navLabel}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** Desktop (≥900px) top navigation shown on every route. Hidden on smaller screens via CSS. */
function TopNav() {
  const { itemCount, total } = useCart();
  return (
    <header className={styles.topnav}>
      <div className={styles.topnavInner}>
        <NavLink to="/" className={styles.brand} aria-label="Chop City Bukka home">
          <img src={logo} alt="" width={40} height={40} className={styles.brandLogo} />
          <span className={styles.brandText}>Chop City <span>Bukka</span></span>
        </NavLink>
        <nav className={styles.topLinks} aria-label="Main">
          {TABS.filter((t) => t.to !== '/bag').map(({ to, label, Icon, ...rest }) => (
            <NavLink key={to} to={to} end={'end' in rest} className={({ isActive }) => `${styles.topLink} ${isActive ? styles.topLinkActive : ''}`}>
              <Icon size={18} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/bag" className={({ isActive }) => `${styles.bagButton} ${isActive ? styles.bagButtonActive : ''}`}>
          <span className={styles.bagIcon}>
            <ShoppingBag size={18} aria-hidden />
            {itemCount > 0 && <span className={styles.bagBadge} aria-label={`${itemCount} items`}>{itemCount}</span>}
          </span>
          <span>Bag</span>
          {itemCount > 0 && <span className={styles.bagTotal}>{formatNaira(total)}</span>}
        </NavLink>
      </div>
    </header>
  );
}

/** Keeps the browser/PWA chrome colour in step with the active theme. */
function useThemeColor() {
  const { isDarkMode } = useUser();
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', isDarkMode ? '#0C2619' : '#F7F3EA');
  }, [isDarkMode]);
}

/**
 * App chrome + the splash screen (shown once per browser session).
 * Lives inside the providers and router, so it also hosts the desktop top nav.
 */
export function Splash({ children }: { children: ReactNode }) {
  useThemeColor();
  const [visible, setVisible] = useState(() => {
    try {
      return !sessionStorage.getItem('citybukka:splashShown');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setVisible(false);
      try { sessionStorage.setItem('citybukka:splashShown', '1'); } catch { /* ignore */ }
    }, 1800);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <>
      <div className={styles.frame}>
        <TopNav />
        <div className={styles.frameBody}>{children}</div>
      </div>
      {visible && (
        <div className={styles.splash} role="presentation">
          <span className={styles.glowA} />
          <span className={styles.glowB} />
          <div className={styles.splashBrand}>
            <img src={logo} alt="" width={132} height={132} className={styles.splashLogo} />
            <p className={styles.splashTitle}>Chop City <span>Bukka</span></p>
            <p className={styles.splashTagline}>AUTHENTIC CULINARY SOUL</p>
            <span className={styles.splashSpinner} />
          </div>
        </div>
      )}
    </>
  );
}
