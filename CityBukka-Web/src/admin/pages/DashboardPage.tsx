import { Activity, Banknote, Bike, ClipboardList, RefreshCw, ShoppingBag, Store, Tags, Users, UtensilsCrossed } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { formatNaira } from '../../lib/format';
import { adminApi } from '../adminApi';
import { STATUS_KEYS, STATUS_LABELS } from '../types';
import { Button, cx, Empty, ErrorBanner, formatDateTime, Loading, PageHead, StatusBadge, styles as s } from '../ui';
import { useLoad } from '../useLoad';

function Stat({ label, value, icon, accent }: { label: string; value: ReactNode; icon: ReactNode; accent?: boolean }) {
  return (
    <div className={cx(s.stat, accent && s.statAccent)}>
      <div className={s.statLabel}>{icon} {label}</div>
      <div className={s.statValue}>{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, error, loading, reload } = useLoad(() => adminApi.stats(), []);
  const navigate = useNavigate();

  const byStatus = data?.ordersByStatus;
  const maxCount = byStatus ? Math.max(1, ...STATUS_KEYS.map((k) => byStatus[k] ?? 0)) : 1;

  return (
    <>
      <PageHead
        title="Dashboard"
        subtitle="Today at a glance"
        actions={<Button onClick={() => void reload()} busy={loading && !!data}><RefreshCw size={16} aria-hidden /> Refresh</Button>}
      />
      <ErrorBanner message={error} onRetry={() => void reload()} />
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className={s.stats}>
            <Stat accent label="Revenue today" value={formatNaira(data.revenueToday)} icon={<Banknote size={14} />} />
            <Stat label="Orders today" value={data.ordersToday} icon={<ShoppingBag size={14} />} />
            <Stat label="Active orders" value={data.activeOrders} icon={<Activity size={14} />} />
            <Stat label="Total orders" value={data.totalOrders} icon={<ClipboardList size={14} />} />
            <Stat label="Restaurants" value={data.restaurants} icon={<Store size={14} />} />
            <Stat label="Menu items" value={data.foodItems} icon={<UtensilsCrossed size={14} />} />
            <Stat label="Categories" value={data.categories} icon={<Tags size={14} />} />
            <Stat label="Users" value={data.users} icon={<Users size={14} />} />
            <Stat label="Riders" value={data.riders ?? 0} icon={<Bike size={14} />} />
          </div>

          <div className={s.dashGrid}>
            <section className={s.panel}>
              <h2 className={s.panelTitle}>Orders by status</h2>
              <div className={s.bars}>
                {STATUS_KEYS.map((key) => {
                  const count = byStatus?.[key] ?? 0;
                  return (
                    <div key={key} className={s.barRow}>
                      <span>{STATUS_LABELS[key]}</span>
                      <div className={s.barTrack}>
                        <div className={s.barFill} style={{ width: `${(count / maxCount) * 100}%` }} />
                      </div>
                      <span className={s.num}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className={s.panelTitle}>Recent orders</h2>
              {data.recentOrders.length === 0 ? (
                <div className={s.panel}><Empty>No orders yet.</Empty></div>
              ) : (
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr><th>Order</th><th>Placed</th><th>Status</th><th className={s.num}>Total</th></tr>
                    </thead>
                    <tbody>
                      {data.recentOrders.map((o) => (
                        <tr key={o.id} className={s.clickable} onClick={() => navigate(`/admin/orders?open=${encodeURIComponent(o.id)}`)}>
                          <td className={s.cardHead}><strong>{o.id}</strong></td>
                          <td data-label="Placed">{formatDateTime(o.createdAt)}</td>
                          <td data-label="Status"><StatusBadge status={o.status} /></td>
                          <td data-label="Total" className={s.num}>{formatNaira(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
