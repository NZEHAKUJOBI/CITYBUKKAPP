import {
  Briefcase, Copy, CupSoda, Package, Phone, ShoppingBag, Soup, UtensilsCrossed,
} from 'lucide-react';
import { useState } from 'react';
import banner from '../../assets/header_banner.jpg';
import { Button } from '../../components/Button';
import { APP } from '../../config/constants';
import { useToast } from '../../state/ToastContext';
import { BottomSheet } from './BottomSheet';
import styles from './HomeScreen.module.css';

const FILTERS = ['Under 30 Mins', 'Rating 4.8+', 'Woodfire Bukka', 'Halal Certified', 'Bukka Fire Spicy'];

/** Port of _showFilterSheet. As in the Flutter app the filters are presentational only. */
export function FilterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (f: string) =>
    setSelected((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f]));

  return (
    <BottomSheet open={open} onClose={onClose} title="Filter by Cuisine & Speed">
      <div className={styles.filterWrap}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={selected.includes(f)}
            className={`${styles.filterChip} ${selected.includes(f) ? styles.filterChipOn : ''}`}
            onClick={() => toggle(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <Button fullWidth height={48} onClick={onClose} style={{ marginTop: 24 }}>Apply Filters</Button>
    </BottomSheet>
  );
}

const HOTLINES = [
  { title: 'Primary Grab & Go Hotline', phone: APP.grabAndGoPhones[0] },
  { title: 'Catering & Bulk Office Orders', phone: APP.grabAndGoPhones[1] },
];

const SERVICES = [
  { Icon: ShoppingBag, label: 'Take Out' },
  { Icon: Soup, label: 'Event & Catering' },
  { Icon: UtensilsCrossed, label: 'Food Trays' },
  { Icon: Briefcase, label: 'Office Lunch' },
  { Icon: Package, label: 'Food Packs' },
  { Icon: CupSoda, label: 'Natural Drinks' },
];

/** Port of _showGrabAndGoSheet: hotline numbers (tap to call, or copy) and services. */
export function GrabAndGoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();

  const copy = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast(`Copied ${phone} to clipboard!`);
    } catch {
      toast(`Couldn't copy ${phone}`, 'error');
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Call for Fast Takeout & Bulk Orders" hideTitle>
      <div className={styles.grabBanner}>
        <img src={banner} alt="" aria-hidden />
        <span className={styles.grabBannerFade} aria-hidden />
        <div className={styles.grabBannerText}>
          <span className={styles.grabBannerTitle}>⚡ GRAB &amp; GO HOTLINES</span>
          <span className={styles.grabBannerSub}>Minna Express</span>
        </div>
      </div>

      <p className={styles.sheetTitle} aria-hidden style={{ marginTop: 18 }}>Call for Fast Takeout &amp; Bulk Orders</p>
      <p className={styles.sheetText}>
        Order ahead, skip the queue, or arrange office lunch trays and event catering.
      </p>

      <ul className={styles.hotlines}>
        {HOTLINES.map(({ title, phone }) => (
          <li key={phone} className={styles.hotline}>
            <a href={`tel:${phone}`} className={styles.hotlineCall} aria-label={`Call ${title}, ${phone}`}>
              <span className={styles.hotlineIcon} aria-hidden><Phone size={18} /></span>
              <span className={styles.hotlineText}>
                <span className={styles.hotlineTitle}>{title}</span>
                <span className={styles.hotlinePhone}>{phone}</span>
              </span>
            </a>
            <button type="button" className={styles.hotlineCopy} onClick={() => void copy(phone)} aria-label={`Copy ${phone}`}>
              <Copy size={14} aria-hidden /> Copy
            </button>
          </li>
        ))}
      </ul>

      <h3 className={styles.servicesTitle}>Featured Bukka Services</h3>
      <ul className={styles.services}>
        {SERVICES.map(({ Icon, label }) => (
          <li key={label} className={styles.servicePill}>
            <Icon size={14} aria-hidden /> {label}
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
