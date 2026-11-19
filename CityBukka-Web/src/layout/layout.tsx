import { Heart, Receipt, ShoppingBag, Store, User } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';
import logo from '../assets/logo_transparent.png';
import { useCart } from '../state/CartContext';
import styles from './layout.module.css';

/**
 * Port of MobileAppShell: full-bleed on phones; on wide screens the app sits in a
 * phone-sized frame. Children with `position: fixed` (toasts) stay inside the frame.
 */
export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.backdrop}>
      <div className={styles.device}>{children}</div>
    </div>
  );
}

/**
 * Standard screen: optional sticky header, scrollable content, optional footer
 * (e.g. an "Add to bag" bar) pinned above the tab bar / bottom edge.
 */
export function Screen({ header, footer, children, className }: {
  header?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <div className={styles.screen}>
      {header}
      <main className={`${styles.content} ${className ?? ''}`}>{children}</main>
      {footer && <div className={styles.footer}>{footer}</div>}
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

/** The five main tabs with the bottom navigation bar (MainNavigationScreen). */
export function TabLayout() {
  const { itemCount } = useCart();
  return (
    <div className={styles.tabs}>
      <div className={styles.tabContent}>
        <Outlet />
      </div>
      <nav className={styles.nav} aria-label="Main">
        {TABS.map(({ to, label, Icon, ...rest }) => (
          <NavLink key={to} to={to} end={'end' in rest} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}>
            {({ isActive }) => (
              <>
                <span className={styles.navIcon}>
                  <Icon size={22} fill={isActive && label !== 'Orders' ? 'currentColor' : 'none'} />
                  {label === 'Bag' && itemCount > 0 && (
                    <span className={styles.badge} aria-label={`${itemCount} items`}>{itemCount}</span>
                  )}
                </span>
                <span className={styles.navLabel}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** Port of SplashScreen – shown once per browser session. */
export function Splash({ children }: { children: ReactNode }) {
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
      {children}
      {visible && (
        <div className={styles.splash} role="presentation">
          <span className={styles.glowA} />
          <span className={styles.glowB} />
          <div className={styles.splashBrand}>
            <img src={logo} alt="" width={140} height={140} className={styles.splashLogo} />
            <p className={styles.splashTitle}>Chop City <span>Bukka</span></p>
            <p className={styles.splashTagline}>AUTHENTIC CULINARY SOUL</p>
            <span className={styles.splashSpinner} />
          </div>
        </div>
      )}
    </>
  );
}
