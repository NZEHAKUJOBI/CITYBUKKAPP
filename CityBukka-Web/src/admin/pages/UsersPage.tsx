import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { adminApi } from '../adminApi';
import type { UserRole } from '../types';
import { Badge, Empty, ErrorBanner, formatDateTime, Loading, PageHead, SearchInput, styles as s } from '../ui';
import { useLoad } from '../useLoad';

const ROLE_FILTERS: Array<{ value: '' | UserRole; label: string }> = [
  { value: '', label: 'All roles' },
  { value: 'customer', label: 'Customers' },
  { value: 'rider', label: 'Riders' },
];

const ROLE_LABEL: Record<string, string> = { customer: 'Customer', rider: 'Rider', admin: 'Admin' };

export default function UsersPage() {
  const [params, setParams] = useSearchParams();
  const roleParam = params.get('role');
  const role: '' | UserRole = roleParam === 'customer' || roleParam === 'rider' ? roleParam : '';
  const { data, error, loading, reload } = useLoad(() => adminApi.users.list(role || undefined), [role]);
  const [query, setQuery] = useState('');

  const setRole = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set('role', value);
    else next.delete('role');
    setParams(next, { replace: true });
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = data ?? [];
    if (!q) return list;
    return list.filter((u) => [u.name, u.email, u.phone].some((v) => v?.toLowerCase().includes(q)));
  }, [data, query]);

  const noun = role === 'rider' ? 'rider' : role === 'customer' ? 'customer' : 'user';

  return (
    <>
      <PageHead title="Users" subtitle={data ? `${data.length} ${noun}${data.length === 1 ? '' : 's'} · read-only` : undefined} />
      <div className={s.toolbar}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, email, phone…" label="Search users" />
        <select className={s.input} style={{ width: 'auto', flex: '1 1 140px' }} aria-label="Filter by role"
          value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLE_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>
      <ErrorBanner message={error} onRetry={() => void reload()} />
      {loading && !data ? <Loading /> : rows.length === 0 ? (
        <div className={s.panel}><Empty>No users found.</Empty></div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Name</th><th>Role</th><th>Email</th><th>Phone</th>
                <th className={s.num}>Loyalty</th><th className={s.num}>Orders</th><th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className={s.cardHead}><strong>{u.name || '—'}</strong></td>
                  <td data-label="Role">
                    <Badge tone={u.role === 'rider' ? 'ok' : undefined}>{ROLE_LABEL[u.role ?? 'customer'] ?? u.role}</Badge>
                  </td>
                  <td data-label="Email">{u.email || '—'}</td>
                  <td data-label="Phone">{u.phone || '—'}</td>
                  <td data-label="Loyalty" className={s.num}>{u.loyaltyPoints ?? 0}</td>
                  <td data-label="Orders" className={s.num}>{u.orderCount ?? 0}</td>
                  <td data-label="Joined">{u.createdAt ? formatDateTime(u.createdAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
