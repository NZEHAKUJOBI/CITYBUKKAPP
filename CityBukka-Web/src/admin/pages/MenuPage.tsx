import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { formatNaira, SPICE_LABELS } from '../../lib/format';
import { SpiceLevel } from '../../types';
import { adminApi, errorMessage, resolveMediaUrl } from '../adminApi';
import { ImageUpload } from '../ImageUpload';
import type { AdminCategory, AdminFoodItem, AdminRestaurant } from '../types';
import {
  Badge, Button, Check, ConfirmDialog, Empty, ErrorBanner, Field, IconButton, Loading, Modal, PageHead,
  SearchInput, styles as s, TextArea, TextField, Thumb, toNumber, Toggle, useDebounced,
} from '../ui';
import { useLoad } from '../useLoad';

type Draft = Omit<AdminFoodItem, 'id'> & { id?: string };

const emptyDraft = (restaurantId = '', categoryId = ''): Draft => ({
  restaurantId,
  categoryId,
  name: '',
  description: '',
  price: 0,
  imageUrl: '',
  spiceLevel: SpiceLevel.none,
  rating: 4.5,
  reviewCount: 0,
  calories: 0,
  prepTimeMinutes: 15,
  isPopular: false,
  isChefSpecial: false,
  isVegetarian: false,
  isAvailable: true,
  customizationGroups: [],
});

const SPICE_OPTIONS = Object.values(SpiceLevel) as SpiceLevel[];

function Select({ label, value, onChange, children, required }:
  { label: string; value: string; onChange: (v: string) => void; children: ReactNode; required?: boolean }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <select id={id} className={s.input} value={value} required={required} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </Field>
  );
}

function FoodForm({ initial, restaurants, categories, onClose, onSaved }: {
  initial: Draft; restaurants: AdminRestaurant[]; categories: AdminCategory[];
  onClose: () => void; onSaved: (f: AdminFoodItem) => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((prev) => ({ ...prev, [key]: value }));
  const editing = !!initial.id;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!(d.price > 0)) {
      setError('Enter a price greater than ₦0 — every menu item needs a price.');
      return;
    }
    setBusy(true);
    setError(null);
    const { id, ...body } = d;
    try {
      const saved = id ? await adminApi.foodItems.update(id, body) : await adminApi.foodItems.create(body);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editing ? `Edit ${initial.name}` : 'New menu item'}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="food-form" variant="primary" busy={busy} disabled={uploading}>
            {editing ? 'Save changes' : 'Create item'}
          </Button>
        </>
      )}
    >
      <ErrorBanner message={error} />
      <form id="food-form" className={s.form} onSubmit={submit}>
        <TextField full label="Name" required value={d.name} onChange={(e) => set('name', e.target.value)} />
        <Select label="Restaurant" required value={d.restaurantId} onChange={(v) => set('restaurantId', v)}>
          <option value="" disabled>Choose a restaurant…</option>
          {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
        <Select label="Category" required value={d.categoryId} onChange={(v) => set('categoryId', v)}>
          <option value="" disabled>Choose a category…</option>
          {categories.filter((c) => c.id !== 'cat_all').map((c) => <option key={c.id} value={c.id}>{c.iconEmoji} {c.name}</option>)}
        </Select>
        <TextArea label="Description" value={d.description} onChange={(v) => set('description', v)} />
        <TextField label="Price (₦) *" type="number" inputMode="numeric" required min={1} step={1} placeholder="e.g. 3500"
          hint="Required" value={d.price > 0 ? d.price : ''}
          onChange={(e) => set('price', toNumber(e.target.value))} />
        <Select label="Spice level" value={String(d.spiceLevel)} onChange={(v) => set('spiceLevel', toNumber(v) as SpiceLevel)}>
          {SPICE_OPTIONS.map((lvl) => <option key={lvl} value={lvl}>{SPICE_LABELS[lvl]}</option>)}
        </Select>
        <TextField label="Calories" type="number" min={0} step={1} value={d.calories}
          onChange={(e) => set('calories', toNumber(e.target.value))} />
        <TextField label="Prep time (minutes)" type="number" min={0} step={1} value={d.prepTimeMinutes}
          onChange={(e) => set('prepTimeMinutes', toNumber(e.target.value))} />
        <TextField label="Rating (0–5)" type="number" min={0} max={5} step={0.1} value={d.rating}
          onChange={(e) => set('rating', toNumber(e.target.value))} />
        <TextField label="Review count" type="number" min={0} step={1} value={d.reviewCount}
          onChange={(e) => set('reviewCount', toNumber(e.target.value))} />
        <div className={`${s.field} ${s.full}`}>
          <span className={s.label}>Flags</span>
          <div className={s.checks}>
            <Check label="Available" checked={d.isAvailable} onChange={(v) => set('isAvailable', v)} />
            <Check label="Popular" checked={d.isPopular} onChange={(v) => set('isPopular', v)} />
            <Check label="Chef's special" checked={d.isChefSpecial} onChange={(v) => set('isChefSpecial', v)} />
            <Check label="Vegetarian" checked={d.isVegetarian} onChange={(v) => set('isVegetarian', v)} />
          </div>
        </div>
        <ImageUpload label="Photo" value={d.imageUrl} onChange={(v) => set('imageUrl', v)} onBusyChange={setUploading} />
      </form>
    </Modal>
  );
}

export default function MenuPage() {
  const [restaurantId, setRestaurantId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim());

  const lookups = useLoad(async () => {
    const [restaurants, categories] = await Promise.all([adminApi.restaurants.list(), adminApi.categories.list()]);
    return { restaurants, categories };
  }, []);
  const items = useLoad(
    () => adminApi.foodItems.list({ restaurantId: restaurantId || undefined, categoryId: categoryId || undefined, q: q || undefined }),
    [restaurantId, categoryId, q],
  );

  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<AdminFoodItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [rowError, setRowError] = useState<string | null>(null);

  const restaurants = useMemo(() => lookups.data?.restaurants ?? [], [lookups.data]);
  const categories = useMemo(() => lookups.data?.categories ?? [], [lookups.data]);
  const restaurantName = useMemo(() => new Map(restaurants.map((r) => [r.id, r.name])), [restaurants]);
  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, `${c.iconEmoji} ${c.name}`])), [categories]);

  useEffect(() => setRowError(null), [restaurantId, categoryId, q]);

  const upsert = (saved: AdminFoodItem) => items.setData((prev) => {
    const list = prev ?? [];
    return list.some((f) => f.id === saved.id) ? list.map((f) => (f.id === saved.id ? saved : f)) : [saved, ...list];
  });

  async function toggleAvailable(item: AdminFoodItem, isAvailable: boolean) {
    setRowError(null);
    setToggling((prev) => new Set(prev).add(item.id));
    upsert({ ...item, isAvailable });
    try {
      upsert(await adminApi.foodItems.update(item.id, { isAvailable }));
    } catch (err) {
      upsert(item);
      setRowError(`Couldn't update ${item.name}: ${errorMessage(err)}`);
    } finally {
      setToggling((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await adminApi.foodItems.remove(deleting.id);
      items.setData((prev) => (prev ?? []).filter((f) => f.id !== deleting.id));
      setDeleting(null);
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  }

  const rows = items.data ?? [];

  return (
    <>
      <PageHead
        title="Menu items"
        subtitle={items.data ? `${rows.length} items` : undefined}
        actions={(
          <Button variant="primary" onClick={() => setEditing(emptyDraft(restaurantId, categoryId))}>
            <Plus size={16} aria-hidden /> New item
          </Button>
        )}
      />
      <div className={s.toolbar}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search dishes…" label="Search menu items" />
        <select className={s.input} style={{ width: 'auto', flex: '1 1 160px' }} aria-label="Filter by restaurant"
          value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
          <option value="">All restaurants</option>
          {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select className={s.input} style={{ width: 'auto', flex: '1 1 160px' }} aria-label="Filter by category"
          value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.filter((c) => c.id !== 'cat_all').map((c) => <option key={c.id} value={c.id}>{c.iconEmoji} {c.name}</option>)}
        </select>
      </div>
      <ErrorBanner message={lookups.error} onRetry={() => void lookups.reload()} />
      <ErrorBanner message={items.error} onRetry={() => void items.reload()} />
      <ErrorBanner message={rowError} />

      {items.loading && !items.data ? <Loading /> : rows.length === 0 ? (
        <div className={s.panel}><Empty>No menu items match these filters.</Empty></div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Dish</th><th>Restaurant</th><th>Category</th><th className={s.num}>Price</th>
                <th>Tags</th><th>Available</th><th><span className={s.srOnly}>Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id}>
                  <td className={s.cardHead}>
                    <div className={s.nameCell}>
                      <Thumb src={resolveMediaUrl(f.imageUrl)} />
                      <div>
                        <strong>{f.name}</strong>
                        <small>{SPICE_LABELS[f.spiceLevel] ?? ''}{f.calories ? ` · ${f.calories} kcal` : ''}</small>
                      </div>
                    </div>
                  </td>
                  <td data-label="Restaurant">{restaurantName.get(f.restaurantId) ?? f.restaurantId}</td>
                  <td data-label="Category">{categoryName.get(f.categoryId) ?? f.categoryId}</td>
                  <td data-label="Price" className={s.num}>{formatNaira(f.price)}</td>
                  <td data-label="Tags">
                    {f.isPopular && <Badge>Popular</Badge>}{' '}
                    {f.isChefSpecial && <Badge>Chef's special</Badge>}{' '}
                    {f.isVegetarian && <Badge tone="ok">Veg</Badge>}
                  </td>
                  <td data-label="Available">
                    <Toggle
                      label={`${f.name} available`}
                      checked={f.isAvailable}
                      disabled={toggling.has(f.id)}
                      onChange={(v) => void toggleAvailable(f, v)}
                    />
                  </td>
                  <td>
                    <div className={s.actions}>
                      <IconButton label={`Edit ${f.name}`} onClick={() => setEditing({ ...f })}><Pencil size={16} /></IconButton>
                      <IconButton label={`Delete ${f.name}`} onClick={() => { setDeleteError(null); setDeleting(f); }}><Trash2 size={16} /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <FoodForm
          initial={editing}
          restaurants={restaurants}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={(saved) => { upsert(saved); setEditing(null); }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete menu item?"
          message={<>Delete <strong>{deleting.name}</strong>? Past orders keep their copy of the item.</>}
          busy={deleteBusy}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
