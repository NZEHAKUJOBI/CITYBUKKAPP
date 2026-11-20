import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { adminApi, errorMessage } from '../adminApi';
import type { AdminCategory } from '../types';
import {
  Button, ConfirmDialog, Empty, ErrorBanner, IconButton, Loading, Modal, PageHead, styles as s, TextArea, TextField, toNumber,
} from '../ui';
import { useLoad } from '../useLoad';

/** sortOrder stays undefined when the server didn't send one, so an edit never silently resets it. */
type Draft = Omit<AdminCategory, 'id'> & { id?: string };

function CategoryForm({ initial, onClose, onSaved }:
  { initial: Draft; onClose: () => void; onSaved: (c: AdminCategory) => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((prev) => ({ ...prev, [key]: value }));
  const editing = !!initial.id;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { id, ...rest } = d;
    const body = rest.sortOrder === undefined ? (({ sortOrder: _omit, ...b }) => b)(rest) : rest;
    try {
      onSaved(id ? await adminApi.categories.update(id, body) : await adminApi.categories.create(body));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      small
      title={editing ? `Edit ${initial.name}` : 'New category'}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="category-form" variant="primary" busy={busy}>{editing ? 'Save' : 'Create'}</Button>
        </>
      )}
    >
      <ErrorBanner message={error} />
      <form id="category-form" className={s.form} onSubmit={submit}>
        <TextField full label="Name" required value={d.name} onChange={(e) => set('name', e.target.value)} />
        <TextField label="Icon emoji" value={d.iconEmoji} maxLength={8} placeholder="🍚" onChange={(e) => set('iconEmoji', e.target.value)} />
        <TextField label="Sort order" type="number" step={1} value={d.sortOrder ?? ''}
          onChange={(e) => set('sortOrder', e.target.value === '' ? undefined : toNumber(e.target.value))} hint="Lower shows first" />
        <TextArea label="Description" value={d.description} onChange={(v) => set('description', v)} />
      </form>
    </Modal>
  );
}

export default function CategoriesPage() {
  const { data, setData, error, loading, reload } = useLoad(() => adminApi.categories.list(), []);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = useMemo(
    // Server already returns categories in sort order; re-sort only when sortOrder is present.
    () => [...(data ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [data],
  );
  const nextSort = rows.length ? Math.max(...rows.map((c) => c.sortOrder ?? 0)) + 1 : 0;

  function onSaved(saved: AdminCategory) {
    setData((prev) => {
      const list = prev ?? [];
      return list.some((c) => c.id === saved.id) ? list.map((c) => (c.id === saved.id ? saved : c)) : [...list, saved];
    });
    setEditing(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await adminApi.categories.remove(deleting.id);
      setData((prev) => (prev ?? []).filter((c) => c.id !== deleting.id));
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
        title="Categories"
        subtitle={data ? `${data.length} categories` : undefined}
        actions={(
          <Button variant="primary" onClick={() => setEditing({ name: '', iconEmoji: '', description: '', sortOrder: nextSort })}>
            <Plus size={16} aria-hidden /> New category
          </Button>
        )}
      />
      <ErrorBanner message={error} onRetry={() => void reload()} />
      {loading && !data ? <Loading /> : rows.length === 0 ? (
        <div className={s.panel}><Empty>No categories yet.</Empty></div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr><th>Category</th><th>Description</th><th className={s.num}>Order</th><th><span className={s.srOnly}>Actions</span></th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className={s.cardHead}>
                    <div className={s.nameCell}>
                      <span style={{ fontSize: 24 }} aria-hidden>{c.iconEmoji}</span>
                      <div><strong>{c.name}</strong><small>{c.id}</small></div>
                    </div>
                  </td>
                  <td data-label="Description">{c.description || '—'}</td>
                  <td data-label="Order" className={s.num}>{c.sortOrder ?? '—'}</td>
                  <td>
                    <div className={s.actions}>
                      <IconButton label={`Edit ${c.name}`} onClick={() => setEditing({ ...c })}><Pencil size={16} /></IconButton>
                      <IconButton
                        label={c.id === 'cat_all' ? `${c.name} is built in and can't be deleted` : `Delete ${c.name}`}
                        disabled={c.id === 'cat_all'}
                        style={c.id === 'cat_all' ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
                        onClick={() => { setDeleteError(null); setDeleting(c); }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <CategoryForm initial={editing} onClose={() => setEditing(null)} onSaved={onSaved} />}
      {deleting && (
        <ConfirmDialog
          title="Delete category?"
          message={<>Delete <strong>{deleting.iconEmoji} {deleting.name}</strong>? Categories that still have menu items can't be deleted.</>}
          busy={deleteBusy}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
