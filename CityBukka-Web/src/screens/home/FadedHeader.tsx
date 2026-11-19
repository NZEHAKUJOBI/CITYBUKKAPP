import { Bell, ChevronDown, MapPin, PhoneCall } from 'lucide-react';
import banner from '../../assets/header_banner.jpg';
import { SearchBar } from '../../components/small';
import styles from './HomeScreen.module.css';

/**
 * Port of FadedAppHeader: delivery location, Grab & Go hotline pill, notifications
 * and the search bar. With `transparentBackground` (as on Home) the screen paints
 * the banner itself; otherwise the header carries its own faded banner.
 */
export function FadedHeader({
  searchValue, onSearchChange, onFilterClick, onNotificationClick, onGrabAndGoClick,
  addressTitle = 'Delivering to Minna',
  addressSubtitle = 'Shiroro Road by Unity Block, Minna',
  transparentBackground = false,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onFilterClick: () => void;
  onNotificationClick: () => void;
  onGrabAndGoClick: () => void;
  addressTitle?: string;
  addressSubtitle?: string;
  transparentBackground?: boolean;
}) {
  return (
    <header className={`${styles.header} ${transparentBackground ? '' : styles.headerFilled}`}>
      {!transparentBackground && (
        <>
          <img src={banner} alt="" className={styles.headerBanner} aria-hidden />
          <span className={styles.headerFade} aria-hidden />
        </>
      )}
      <div className={styles.headerInner}>
        <div className={styles.headerTop}>
          <div className={styles.location}>
            <span className={styles.locationIcon} aria-hidden><MapPin size={18} fill="currentColor" stroke="var(--bg)" /></span>
            <div className={styles.locationText}>
              <p className={styles.locationTitle}>
                <span className="ellipsis">{addressTitle}</span>
                <ChevronDown size={18} aria-hidden />
              </p>
              <p className={`${styles.locationSubtitle} ellipsis`}>{addressSubtitle}</p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button type="button" className={styles.grabPill} onClick={onGrabAndGoClick} aria-haspopup="dialog">
              <PhoneCall size={13} aria-hidden />
              Grab &amp; Go
            </button>
            <button type="button" className={styles.bell} onClick={onNotificationClick} aria-label="Notifications">
              <Bell size={22} aria-hidden />
              <span className={styles.bellDot} aria-hidden />
            </button>
          </div>
        </div>

        <SearchBar value={searchValue} onChange={onSearchChange} onFilterClick={onFilterClick} />
      </div>
    </header>
  );
}
