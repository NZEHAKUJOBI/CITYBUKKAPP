import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { AdminApiError, adminApi, errorMessage } from '../adminApi';
import type { AdminRider, RiderPatch } from '../types';
import {
  Badge, Button, ConfirmDialog, Empty, ErrorBanner, IconButton, Loading, Modal, PageHead, SearchInput,
  styles as s, TextField, Toggle,
} from '../ui';
import { useLoad } from '../useLoad';

export const PHONE_HINT = 'Nigerian mobile, e.g. 0803 123 4567';
const MIN_PASSWORD = 8;

/** Rider-specific wording for errors the riders endpoints return. */
export function riderErrorMessage(err: unknown): string {
  if (err instanceof AdminApiError && err.code === 'in_use') {
    return 'This rider still has active deliveries. Reassign or finish those orders first, or deactivate the rider instead.';
  }
  return errorMessage(err);
}

const fieldErrorFor = (err: unknown) =>
  err instanceof AdminApiError && (err.code === 'invalid_phone' || err.code === 'phone_taken') ? errorMessage(err) : undefined;

interface Draft {
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  plateNumber: string;
  password: string;
}

const toDraft = (r?: AdminRider): Draft => ({
  name: r?.name ?? '',
  phone: r?.phone ?? '',
  email: r?.email ?? '',
  vehicle: r?.vehicle ?? 'Motorbike',
  plateNumber: r?.plateNumber ?? '',
  password: '',
});

function RiderForm({ rider, onClose, onSaved }: { rider?: AdminRider; onClose: () => void; onSaved: (r: AdminRider) => void }) {
  const [d, setD] = useState<Draft>(() => toDraft(rider));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((prev) => ({ ...prev, [key]: value }));
  const editing = !!rider;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPhoneError(undefined);
    if (!editing && d.password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    try {
      let saved: AdminRider;
      if (rider) {
        const patch: RiderPatch = {};
        if (d.name.trim() !== rider.name) patch.name = d.name.trim();
        if (d.phone.trim() !== rider.phone) patch.phone = d.phone.trim();
        if (d.vehicle.trim() !== rider.vehicle) patch.vehicle = d.vehicle.trim();
        if (d.plateNumber.trim() !== (rider.plateNumber ?? '')) patch.plateNumber = d.plateNumber.trim();
        saved = await adminApi.riders.update(rider.id, patch);
      } else {
        saved = await adminApi.riders.create({
          name: d.name.trim(),
          phone: d.phone.trim(),
          password: d.password,
          vehicle: d.vehicle.trim(),
          ...(d.plateNumber.trim() ? { plateNumber: d.plateNumber.trim() } : {}),
          ...(d.email.trim() ? { email: d.email.trim() } : {}),
        });
      }
      onSaved(saved);
    } catch (err) {
      const fieldErr = fieldErrorFor(err);
      if (fieldErr) setPhoneError(fieldErr);
      else setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editing ? `Edit ${rider.name}` : 'New rider'}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="rider-form" variant="primary" busy={busy}>
            {editing ? 'Save changes' : 'Create rider'}
          </Button>
        </>
      )}
    >
      <ErrorBanner message={error} />
      <form id="rider-form" className={s.form} onSubmit={submit}>
        <TextField full label="Full name" required value={d.name} onChange={(e) => set('name', e.target.value)} />
        <TextField
          label="Phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          required
          placeholder="0803 123 4567"
          hint={PHONE_HINT}
          error={phoneError}
          value={d.phone}
          onChange={(e) => { set('phone', e.target.value); setPhoneError(undefined); }}
        />
        {!editing && (
          <TextField label="Email (optional)" type="email" autoComplete="off" value={d.email}
            onChange={(e) => set('email', e.target.value)} />
        )}
        <TextField label="Vehicle" required placeholder="Motorbike, Bicycle, Car…" value={d.vehicle}
          onChange={(e) => set('vehicle', e.target.value)} />
        <TextField label="Plate number (optional)" placeholder="LSD 123 AB" value={d.plateNumber}
          onChange={(e) => set('plateNumber', e.target.value)} />
        {!editing && (
          <TextField
            full
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD}
            hint={`At least ${MIN_PASSWORD} characters. Share it with the rider; they sign in at /rider.`}
            value={d.password}
            onChange={(e) => set('password', e.target.value)}
          />
        )}
      </form>
    </Modal>
  );
}

function ResetPassword({ rider, onClose, onDone }: { rider: AdminRider; onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminApi.riders.update(rider.id, { password });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      small
      title={`Reset password · ${rider.name}`}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="rider-password-form" variant="primary" busy={busy}>Set password</Button>
        </>
      )}
    >
      <ErrorBanner message={error} />
      <form id="rider-password-form" className={s.form} onSubmit={submit}>
        <TextField
          full
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD}
          hint="The rider will need this new password to sign in."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </form>
    </Modal>
  );
}

export default function RidersPage() {
  const { data, setData, error, loading, reload } = useLoad(() => adminApi.riders.list(), []);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<AdminRider | 'new' | null>(null);
  const [resetting, setResetting] = useState<AdminRider | null>(null);
  const [deleting, setDeleting] = useState<AdminRider | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = data ?? [];
    if (!q) return list;
    return list.filter((r) => [r.name, r.phone, r.vehicle, r.plateNumber, r.email].some((v) => v?.toLowerCase().includes(q)));
  }, [data, query]);

  const upsert = (rider: AdminRider) =>
    setData((prev) => {
      const list = prev ?? [];
      return list.some((r) => r.id === rider.id) ? list.map((r) => (r.id === rider.id ? { ...r, ...rider } : r)) : [rider, ...list];
    });

  async function toggleActive(rider: AdminRider, isActive: boolean) {
    setBusyId(rider.id);
    setActionError(null);
    setNotice(null);
    try {
      upsert(await adminApi.riders.update(rider.id, { isActive }));
    } catch (err) {
      setActionError(riderErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusyId(deleting.id);
    setActionError(null);
    try {
      await adminApi.riders.remove(deleting.id);
      setData((prev) => (prev ?? []).filter((r) => r.id !== deleting.id));
      setDeleting(null);
    } catch (err) {
      setActionError(riderErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = (data ?? []).filter((r) => r.isActive).length;

  return (
    <>
      <PageHead
        title="Riders"
        subtitle={data ? `${data.length} rider${data.length === 1 ? '' : 's'} · ${activeCount} active` : undefined}
        actions={<Button variant="primary" onClick={() => setEditing('new')}><Plus size={16} aria-hidden /> New rider</Button>}
      />
      <div className={s.toolbar}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, phone, vehicle, plate…" label="Search riders" />
      </div>
      <ErrorBanner message={error} onRetry={() => void reload()} />
      {!deleting && <ErrorBanner message={actionError} />}
      {notice && <div className={s.panel} role="status" style={{ marginBottom: 14 }}>{notice}</div>}

      {loading && !data ? <Loading /> : rows.length === 0 ? (
        <div className={s.panel}><Empty>{query ? 'No riders match your search.' : 'No riders yet. Add one to start assigning deliveries.'}</Empty></div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Rider</th><th>Phone</th><th>Vehicle</th><th>Plate</th>
                <th className={s.num}>Active</th><th className={s.num}>Delivered</th><th>Status</th>
                <th><span className={s.srOnly}>Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={s.cardHead}>
                    <div className={s.nameCell}>
                      <div>
                        <strong>{r.name}</strong>
                        {r.email && <small>{r.email}</small>}
                      </div>
                    </div>
                  </td>
                  <td data-label="Phone"><a href={`tel:${r.phone}`}>{r.phone}</a></td>
                  <td data-label="Vehicle">{r.vehicle || '—'}</td>
                  <td data-label="Plate">{r.plateNumber || '—'}</td>
                  <td data-label="Active orders" className={s.num}>{r.activeOrders ?? 0}</td>
                  <td data-label="Delivered" className={s.num}>{r.deliveredOrders ?? 0}</td>
                  <td data-label="Status">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Toggle
                        label={`${r.name} active`}
                        checked={r.isActive}
                        disabled={busyId === r.id}
                        onChange={(v) => void toggleActive(r, v)}
                      />
                      <Badge tone={r.isActive ? 'ok' : 'off'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
                    </span>
                  </td>
                  <td className={s.actions}>
                    <IconButton label={`Edit ${r.name}`} onClick={() => setEditing(r)}><Pencil size={16} /></IconButton>
                    <IconButton label={`Reset password for ${r.name}`} onClick={() => setResetting(r)}><KeyRound size={16} /></IconButton>
                    <IconButton label={`Delete ${r.name}`} onClick={() => { setActionError(null); setDeleting(r); }}>
                      <Trash2 size={16} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <RiderForm
          rider={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={(r) => {
            upsert(r);
            setNotice(editing === 'new' ? `${r.name} can now sign in at /rider with their phone number and password.` : null);
            setEditing(null);
          }}
        />
      )}
      {resetting && (
        <ResetPassword
          rider={resetting}
          onClose={() => setResetting(null)}
          onDone={() => { setNotice(`Password updated for ${resetting.name}.`); setResetting(null); }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete rider"
          message={<>Delete <strong>{deleting.name}</strong>? They will no longer be able to sign in. Riders with active deliveries can’t be deleted — deactivate them instead.</>}
          busy={busyId === deleting.id}
          error={actionError}
          onConfirm={() => void remove()}
          onCancel={() => { setDeleting(null); setActionError(null); }}
        />
      )}
    </>
  );
}
