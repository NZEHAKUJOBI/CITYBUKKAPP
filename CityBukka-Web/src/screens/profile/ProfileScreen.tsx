import {
  ChevronRight, Headset, Info, LogOut, Mail, MapPin, Medal, Moon, Pencil, Trash2, User,
} from 'lucide-react';
import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { FallbackImage } from '../../components/small';
import { APP } from '../../config/constants';
import { errorMessage } from '../../data/client';
import type { ProfileChanges } from '../../data/customerApi';
import { Screen } from '../../layout/layout';
import { formatPhone } from '../../lib/phone';
import { useAuth } from '../../state/AuthContext';
import { useToast } from '../../state/ToastContext';
import { useUser } from '../../state/UserContext';
import page from '../../styles/page.module.css';
import type { UserProfile } from '../../types';
import { Modal } from '../orders/Modal';
import styles from './ProfileScreen.module.css';

const KEYPAD: Record<string, string> = {
  A: '2', B: '2', C: '2', D: '3', E: '3', F: '3', G: '4', H: '4', I: '4', J: '5', K: '5', L: '5',
  M: '6', N: '6', O: '6', P: '7', Q: '7', R: '7', S: '7', T: '8', U: '8', V: '8', W: '9', X: '9', Y: '9', Z: '9',
};

/** "+234 800 BUKKA MX" → "tel:+2348002855269" (vanity letters dialled as keypad digits). */
const supportTelHref = (phone: string) =>
  `tel:${phone.toUpperCase().replace(/[A-Z]/g, (c) => KEYPAD[c] ?? '').replace(/[^\d+]/g, '')}`;

/** Profile tab: the signed-in customer's real account (GET/PATCH /api/me). */
export function ProfileScreen() {
  const { profile, refreshProfile, isDarkMode, setDarkMode } = useUser();
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<'edit' | 'addresses' | null>(null);
  const close = useCallback(() => setDialog(null), []);

  useEffect(() => { void refreshProfile().catch(() => { /* cached profile is fine */ }); }, [refreshProfile]);

  if (!profile) return null; // RequireAuth redirects signed-out visitors.

  const signOut = () => {
    logout();
    toast('You have been signed out.');
    navigate('/', { replace: true });
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
            aria-haspopup="dialog"
            onClick={() => setDialog('edit')}
          >
            <Pencil size={20} aria-hidden />
          </button>
        </header>
      }
    >
      <div className={styles.page}>
        <div className={styles.profileCol}>
          <section className={styles.user} aria-label="Account">
            <FallbackImage src={profile.avatarUrl} alt="" fallbackIcon={<User size={32} />} className={styles.avatar} />
            <div className={styles.userInfo}>
              <p className={`${styles.name} ellipsis`}>{profile.name}</p>
              <p className={styles.phone}>{formatPhone(profile.phone)}</p>
              {profile.email && <p className={`${styles.email} ellipsis`}>{profile.email}</p>}
            </div>
          </section>

          {profile.loyaltyPoints > 0 && (
            <section className={styles.loyalty} aria-label="Rewards">
              <span className={styles.loyaltyIcon} aria-hidden><Medal size={28} /></span>
              <div className={styles.loyaltyBody}>
                <p className={styles.loyaltyTitle}>Bukka Rewards</p>
                <p className={styles.loyaltyText}>{profile.loyaltyPoints.toLocaleString('en-NG')} Fire Points</p>
              </div>
            </section>
          )}
        </div>

        <div className={styles.settingsCol}>
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
              <button type="button" className={styles.item} onClick={() => setDialog('addresses')} aria-haspopup="dialog">
                <MapPin size={22} className={styles.itemIcon} aria-hidden />
                <span className={styles.itemText}>
                  <span className={styles.itemTitle}>Saved Addresses</span>
                  <span className={`${styles.itemSub} ellipsis`}>
                    {profile.selectedAddress || (profile.savedAddresses.length === 0 ? 'Add a delivery address' : `${profile.savedAddresses.length} addresses`)}
                  </span>
                </span>
                <ChevronRight size={20} aria-hidden />
              </button>
            </li>
          </ul>

          <h2 className={styles.sectionTitle}>Support &amp; About</h2>
          <ul className={styles.settings}>
            <li>
              <a className={styles.item} href={supportTelHref(APP.supportPhone)}>
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
                  <span className={styles.itemSub}>{APP.tagline}</span>
                </span>
              </div>
            </li>
          </ul>

          <button type="button" className={styles.logout} onClick={signOut}>
            <LogOut size={18} aria-hidden /> Log Out
          </button>
        </div>
      </div>

      {dialog === 'edit' && <EditProfileDialog profile={profile} onClose={close} />}
      {dialog === 'addresses' && <AddressesDialog profile={profile} onClose={close} />}
    </Screen>
  );
}

function EditProfileDialog({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const { updateProfile } = useUser();
  const toast = useToast();
  const id = useId();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    const changes: ProfileChanges = {};
    if (!name.trim()) return setError('Name cannot be empty.');
    if (name.trim() !== profile.name) changes.name = name.trim();
    const mail = email.trim();
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return setError('Enter a valid email address.');
    if (mail !== (profile.email ?? '')) changes.email = mail; // '' clears it
    if (Object.keys(changes).length === 0) return onClose();
    setSaving(true);
    setError(null);
    try {
      await updateProfile(changes);
      toast('Profile updated.', 'success');
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save your profile.'));
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Edit profile"
      onClose={onClose}
      actions={(
        <>
          <Button variant="outlined" height={42} onClick={onClose}>Cancel</Button>
          <Button height={42} loading={saving} onClick={() => void save()}>Save</Button>
        </>
      )}
    >
      <form className={page.form} onSubmit={save} noValidate>
        {error && <p role="alert" className={page.formError}>{error}</p>}
        <div className={page.field}>
          <label htmlFor={`${id}-name`} className={page.label}>Full name</label>
          <input id={`${id}-name`} className={page.input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} />
        </div>
        <div className={page.field}>
          <label htmlFor={`${id}-email`} className={page.label}>Email <span className={page.optional}>(optional)</span></label>
          <input id={`${id}-email`} className={page.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={200} />
        </div>
        <p className={page.hint}>Phone number: {formatPhone(profile.phone)} (contact support to change it)</p>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function AddressesDialog({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const { updateProfile } = useUser();
  const toast = useToast();
  const id = useId();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = async (changes: ProfileChanges, success: string) => {
    setBusy(true);
    setError(null);
    try {
      await updateProfile(changes);
      toast(success, 'success');
      return true;
    } catch (err) {
      setError(errorMessage(err, 'Could not update your addresses.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const address = draft.trim().replace(/\s+/g, ' ');
    if (address.length < 3) return setError('Enter a full delivery address.');
    if (profile.savedAddresses.includes(address)) return setError('That address is already saved.');
    if (profile.savedAddresses.length >= 10) return setError('You can save up to 10 addresses.');
    if (await apply({ savedAddresses: [...profile.savedAddresses, address], selectedAddress: address }, 'Address added.')) setDraft('');
  };

  const remove = (address: string) => {
    const remaining = profile.savedAddresses.filter((a) => a !== address);
    const changes: ProfileChanges = { savedAddresses: remaining };
    if (profile.selectedAddress === address && remaining[0]) changes.selectedAddress = remaining[0];
    void apply(changes, 'Address removed.');
  };

  return (
    <Modal
      title="Saved Addresses"
      onClose={onClose}
      actions={<Button height={42} onClick={onClose}>Done</Button>}
    >
      {error && <p role="alert" className={page.formError} style={{ marginBottom: 12 }}>{error}</p>}
      {profile.savedAddresses.length > 0 ? (
        <fieldset className={styles.addresses} disabled={busy}>
          <legend className="visually-hidden">Default delivery address</legend>
          {profile.savedAddresses.map((address) => (
            <div key={address} className={styles.addressRow}>
              <label className={styles.address}>
                <input
                  type="radio"
                  name="selectedAddress"
                  value={address}
                  checked={profile.selectedAddress === address}
                  onChange={() => void apply({ selectedAddress: address }, 'Delivery address updated.')}
                />
                <span>{address}</span>
              </label>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Remove ${address}`}
                onClick={() => remove(address)}
              >
                <Trash2 size={18} aria-hidden />
              </button>
            </div>
          ))}
        </fieldset>
      ) : (
        <p className={page.hint}>No saved addresses yet. Add one below.</p>
      )}

      <form className={`${page.form} ${styles.addForm}`} onSubmit={add} noValidate>
        <div className={page.field}>
          <label htmlFor={`${id}-new`} className={page.label}>Add an address</label>
          <textarea
            id={`${id}-new`}
            className={page.input}
            rows={2}
            maxLength={200}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="House number, street, area and a landmark"
            autoComplete="street-address"
          />
        </div>
        <Button type="submit" variant="outlined" height={42} loading={busy}>Save address</Button>
      </form>
    </Modal>
  );
}
