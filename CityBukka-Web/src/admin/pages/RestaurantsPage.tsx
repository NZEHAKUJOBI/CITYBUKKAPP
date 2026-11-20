import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { formatNaira } from '../../lib/format';
import { adminApi, errorMessage, resolveMediaUrl } from '../adminApi';
import { ImageUpload } from '../ImageUpload';
import type { AdminRestaurant } from '../types';
import {
  Badge, Button, Check, ChipsInput, ConfirmDialog, Empty, ErrorBanner, IconButton, Loading, Modal, PageHead,
  SearchInput, styles as s, TextArea, TextField, Thumb, toNumber,
} from '../ui';
import { useLoad } from '../useLoad';

type Draft = Omit<AdminRestaurant, 'id'> & { id?: string };

const EMPTY: Draft = {
  name: '',
  tagline: '',
  description: '',
  address: '',
  cuisines: [],
  badges: [],
  rating: 4.5,
  reviewCount: 0,
  deliveryTimeMin: 20,
  deliveryTimeMax: 35,
  deliveryFee: 650,
  distanceKm: 1,
  isFeatured: false,
  isOpen: true,
  coverImageUrl: '',
  logoUrl: '',
};

function RestaurantForm({ initial, onClose, onSaved }:
  { initial: Draft; onClose: () => void; onSaved: (r: AdminRestaurant) => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((prev) => ({ ...prev, [key]: value }));
  const editing = !!initial.id;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (d.deliveryTimeMax < d.deliveryTimeMin) {
      setError('Max delivery time must be at least the min delivery time.');
      return;
    }
    setBusy(true);
    setError(null);
    const { id, ...body } = d;
    try {
      const saved = id ? await adminApi.restaurants.update(id, body) : await adminApi.restaurants.create(body);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const busyChange = (b: boolean) => setUploading((n) => n + (b ? 1 : -1));

  return (
    <Modal
      title={editing ? `Edit ${initial.name}` : 'New restaurant'}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="restaurant-form" variant="primary" busy={busy} disabled={uploading > 0}>
            {editing ? 'Save changes' : 'Create restaurant'}
          </Button>
        </>
      )}
    >
      <ErrorBanner message={error} />
      <form id="restaurant-form" className={s.form} onSubmit={submit}>
        <TextField label="Name" required value={d.name} onChange={(e) => set('name', e.target.value)} />
        <TextField label="Tagline" value={d.tagline} onChange={(e) => set('tagline', e.target.value)} />
        <TextArea label="Description" value={d.description} onChange={(v) => set('description', v)} />
        <TextField full label="Address" value={d.address} onChange={(e) => set('address', e.target.value)} />
        <ChipsInput label="Cuisines" value={d.cuisines} onChange={(v) => set('cuisines', v)} />
        <ChipsInput label="Badges" value={d.badges} onChange={(v) => set('badges', v)} />
        <TextField label="Rating (0–5)" type="number" min={0} max={5} step={0.1} value={d.rating}
          onChange={(e) => set('rating', toNumber(e.target.value))} />
        <TextField label="Review count" type="number" min={0} step={1} value={d.reviewCount}
          onChange={(e) => set('reviewCount', toNumber(e.target.value))} />
        <TextField label="Delivery time min (minutes)" type="number" min={0} step={1} value={d.deliveryTimeMin}
          onChange={(e) => set('deliveryTimeMin', toNumber(e.target.value))} />
        <TextField label="Delivery time max (minutes)" type="number" min={0} step={1} value={d.deliveryTimeMax}
          onChange={(e) => set('deliveryTimeMax', toNumber(e.target.value))} />
        <TextField label="Delivery fee (₦)" type="number" min={0} step={1} value={d.deliveryFee}
          onChange={(e) => set('deliveryFee', toNumber(e.target.value))} />
        <TextField label="Distance (km)" type="number" min={0} step={0.1} value={d.distanceKm}
          onChange={(e) => set('distanceKm', toNumber(e.target.value))} />
        <div className={`${s.field} ${s.full}`}>
          <span className={s.label}>Flags</span>
          <div className={s.checks}>
            <Check label="Featured" checked={d.isFeatured} onChange={(v) => set('isFeatured', v)} />
            <Check label="Open now" checked={d.isOpen} onChange={(v) => set('isOpen', v)} />
          </div>
        </div>
        <ImageUpload label="Cover image" value={d.coverImageUrl} onChange={(v) => set('coverImageUrl', v)} onBusyChange={busyChange} />
        <ImageUpload label="Logo" value={d.logoUrl} onChange={(v) => set('logoUrl', v)} onBusyChange={busyChange} />
      </form>
    </Modal>
  );
}

export default function RestaurantsPage() {
  const { data, setData, error, loading, reload } = useLoad(() => adminApi.restaurants.list(), []);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<AdminRestaurant | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = data ?? [];
    if (!q) return list;
    return list.filter((r) => [r.name, r.tagline, r.address, ...r.cuisines].some((v) => v?.toLowerCase().includes(q)));
  }, [data, query]);

  function onSaved(saved: AdminRestaurant) {
    setData((prev) => {
      const list = prev ?? [];
      return list.some((r) => r.id === saved.id) ? list.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...list];
    });
    setEditing(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await adminApi.restaurants.remove(deleting.id);
      setData((prev) => (prev ?? []).filter((r) => r.id !== deleting.id));
      setDeleting(null);
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <PageHead
        title="Restaurants"
        subtitle={data ? `${data.length} bukkas` : undefined}
        actions={<Button variant="primary" onClick={() => setEditing({ ...EMPTY })}><Plus size={16} aria-hidden /> New restaurant</Button>}
      />
      <div className={s.toolbar}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, cuisine, address…" label="Search restaurants" />
      </div>
      <ErrorBanner message={error} onRetry={() => void reload()} />
      {loading && !data ? <Loading /> : rows.length === 0 ? (
        <div className={s.panel}><Empty>{query ? 'No restaurants match your search.' : 'No restaurants yet.'}</Empty></div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Restaurant</th><th>Cuisines</th><th className={s.num}>Rating</th><th className={s.num}>Delivery</th>
                <th>Status</th><th><span className={s.srOnly}>Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={s.cardHead}>
                    <div className={s.nameCell}>
                      <Thumb src={resolveMediaUrl(r.logoUrl || r.coverImageUrl)} />
                      <div>
                        <strong>{r.name}</strong>
                        <small>{r.tagline}</small>
                      </div>
                    </div>
                  </td>
                  <td data-label="Cuisines">{r.cuisines.join(', ') || '—'}</td>
                  <td data-label="Rating" className={s.num}>{r.rating.toFixed(1)} <span className={s.muted}>({r.reviewCount})</span></td>
                  <td data-label="Delivery" className={s.num}>
                    {r.deliveryTimeMin}–{r.deliveryTimeMax} min · {formatNaira(r.deliveryFee)}
                  </td>
                  <td data-label="Status">
                    <Badge tone={r.isOpen ? 'ok' : 'off'}>{r.isOpen ? 'Open' : 'Closed'}</Badge>{' '}
                    {r.isFeatured && <Badge>Featured</Badge>}
                  </td>
                  <td>
                    <div className={s.actions}>
                      <IconButton label={`Edit ${r.name}`} onClick={() => setEditing({ ...EMPTY, ...r })}><Pencil size={16} /></IconButton>
                      <IconButton label={`Delete ${r.name}`} onClick={() => { setDeleteError(null); setDeleting(r); }}><Trash2 size={16} /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <RestaurantForm initial={editing} onClose={() => setEditing(null)} onSaved={onSaved} />}
      {deleting && (
        <ConfirmDialog
          title="Delete restaurant?"
          message={<>Delete <strong>{deleting.name}</strong>? This cannot be undone.</>}
          busy={deleteBusy}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
