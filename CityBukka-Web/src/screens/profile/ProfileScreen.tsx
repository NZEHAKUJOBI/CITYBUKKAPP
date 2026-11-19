import {
  ChevronRight, Headset, Info, LogOut, Mail, MapPin, Medal, Moon, Pencil, User, UtensilsCrossed,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { FallbackImage } from '../../components/small';
import { APP } from '../../config/constants';
import { Screen } from '../../layout/layout';
import { useToast } from '../../state/ToastContext';
import { useUser } from '../../state/UserContext';
import { Modal } from '../orders/Modal';
import styles from './ProfileScreen.module.css';

const KEYPAD: Record<string, string> = {
  A: '2', B: '2', C: '2', D: '3', E: '3', F: '3', G: '4', H: '4', I: '4', J: '5', K: '5', L: '5',
  M: '6', N: '6', O: '6', P: '7', Q: '7', R: '7', S: '7', T: '8', U: '8', V: '8', W: '9', X: '9', Y: '9', Z: '9',
};

/** "+234 800 BUKKA MX" → "tel:+2348002855269" (vanity letters dialled as keypad digits). */
const telHref = (phone: string) =>
  `tel:${phone.toUpperCase().replace(/[A-Z]/g, (c) => KEYPAD[c] ?? '').replace(/[^\d+]/g, '')}`;

/** Port of ProfileScreen. */
export function ProfileScreen() {
  const { profile, updateProfile, isDarkMode, setDarkMode } = useUser();
  const toast = useToast();
  const [addressesOpen, setAddressesOpen] = useState(false);
  const closeAddresses = useCallback(() => setAddressesOpen(false), []);

  const selectAddress = (address: string) => {
    updateProfile({ selectedAddress: address });
    toast('Delivery address updated.', 'success');
  };

  return (
    <Screen
      header={
        <header className={styles.header}>
          <h1 className={styles.title}>My Profile</h1>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Edit profile"
            onClick={() => toast('Edit profile feature enabled!')}
          >
            <Pencil size={20} />
          </button>
        </header>
      }
    >
      <div className={styles.page}>
        {/* User card */}
        <section className={styles.user} aria-label="Account">
          <FallbackImage src={profile.avatarUrl} alt="" fallbackIcon={<User size={32} />} className={styles.avatar} />
          <div className={styles.userInfo}>
            <p className={`${styles.name} ellipsis`}>{profile.name}</p>
            <p className={`${styles.email} ellipsis`}>{profile.email}</p>
            <p className={styles.phone}>{profile.phone}</p>
          </div>
        </section>

        {/* Loyalty card */}
        <section className={styles.loyalty} aria-label="Rewards">
          <span className={styles.loyaltyIcon} aria-hidden><Medal size={28} /></span>
          <div>
            <p className={styles.loyaltyTitle}>Bukka MX Rewards</p>
            <p className={styles.loyaltyText}>
              {profile.loyaltyPoints} Fire Points Available (Worth ₦{profile.loyaltyPoints})
            </p>
          </div>
        </section>

        <h2 className={styles.sectionTitle}>App &amp; Dining Settings</h2>
        <ul className={styles.settings}>
          <li>
            <label className={styles.item}>
              <Moon size={22} className={styles.itemIcon} aria-hidden />
              <span className={styles.itemText}>
                <span className={styles.itemTitle}>Dark Mode Theme</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                className={styles.switch}
                checked={isDarkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
            </label>
          </li>
          <li>
            <button type="button" className={styles.item} onClick={() => setAddressesOpen(true)} aria-haspopup="dialog">
              <MapPin size={22} className={styles.itemIcon} aria-hidden />
              <span className={styles.itemText}>
                <span className={styles.itemTitle}>Saved Addresses</span>
                <span className={styles.itemSub}>{profile.savedAddresses.length} addresses</span>
              </span>
              <ChevronRight size={20} aria-hidden />
            </button>
          </li>
          <li>
            <div className={styles.item}>
              <UtensilsCrossed size={22} className={styles.itemIcon} aria-hidden />
              <span className={styles.itemText}>
                <span className={styles.itemTitle}>Dietary Preferences</span>
                <span className={styles.itemSub}>Halal, Spicy Lover, Peppery</span>
              </span>
            </div>
          </li>
        </ul>

        <h2 className={styles.sectionTitle}>Support &amp; About</h2>
        <ul className={styles.settings}>
          <li>
            <a className={styles.item} href={telHref(APP.supportPhone)}>
              <Headset size={22} className={styles.itemIcon} aria-hidden />
              <span className={styles.itemText}>
                <span className={styles.itemTitle}>24/7 Bukka Support</span>
                <span className={styles.itemSub}>{APP.supportPhone}</span>
              </span>
              <ChevronRight size={20} aria-hidden />
            </a>
          </li>
          <li>
            <a className={styles.item} href={`mailto:${APP.supportEmail}`}>
              <Mail size={22} className={styles.itemIcon} aria-hidden />
              <span className={styles.itemText}>
                <span className={styles.itemTitle}>Email Support</span>
                <span className={styles.itemSub}>{APP.supportEmail}</span>
              </span>
              <ChevronRight size={20} aria-hidden />
            </a>
          </li>
          <li>
            <div className={styles.item}>
              <Info size={22} className={styles.itemIcon} aria-hidden />
              <span className={styles.itemText}>
                <span className={styles.itemTitle}>About {APP.name}</span>
                <span className={styles.itemSub}>v1.0.0 Production Build</span>
              </span>
            </div>
          </li>
        </ul>

        <button type="button" className={styles.logout} onClick={() => toast('Logged out of CityBukka MX demo.')}>
          <LogOut size={18} aria-hidden /> Log Out
        </button>
      </div>

      {addressesOpen && (
        <Modal title="Saved Addresses" onClose={closeAddresses}>
          <fieldset className={styles.addresses}>
            <legend className="visually-hidden">Delivery address</legend>
            {profile.savedAddresses.map((address) => (
              <label key={address} className={styles.address}>
                <input
                  type="radio"
                  name="selectedAddress"
                  value={address}
                  checked={profile.selectedAddress === address}
                  onChange={() => selectAddress(address)}
                />
                <span>{address}</span>
              </label>
            ))}
          </fieldset>
        </Modal>
      )}
    </Screen>
  );
}
