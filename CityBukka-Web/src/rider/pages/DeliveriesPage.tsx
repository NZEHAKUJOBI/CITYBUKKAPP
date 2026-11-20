import { Banknote, MapPin, Package, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button, cx, ErrorBanner, Loading } from '../../admin/ui';
import { useLoad } from '../../admin/useLoad';
import { formatNaira } from '../../lib/format';
import r from '../rider.module.css';
import { riderApi, riderErrorMessage } from '../riderApi';
import { isCashOnDelivery, itemCount, RIDER_STATUS_LABELS, type DeliveryScope, type RiderOrder } from '../types';

export const AUTO_REFRESH_MS = 20_000;

/** Calls `refresh` every `ms` while the page is visible, and right away when it becomes visible again. */
export function useAutoRefresh(refresh: () => void, ms = AUTO_REFRESH_MS) {
  const ref = useRef(refresh);
  ref.current = refresh;
  useEffect(() => {
    const visible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';
    const timer = setInterval(() => { if (visible()) ref.current(); }, ms);
    const onVisibility = () => { if (visible()) ref.current(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ms]);
}

export function StatusChip({ status }: { status: number }) {
  return <span className={cx(r.chip, r[`chip_${status}`])}>{RIDER_STATUS_LABELS[status] ?? 'Unknown'}</span>;
}

function OrderCard({ order }: { order: RiderOrder }) {
  const count = itemCount(order);
  const cash = isCashOnDelivery(order.paymentMethod);
  return (
    <li>
      <Link to={`/rider/orders/${encodeURIComponent(order.id)}`} className={r.card} aria-label={`Order ${order.id}`}>
        <div className={r.cardTop}>
          <span className={r.orderId}>#{order.id}</span>
          <StatusChip status={order.status} />
        </div>
        <div className={r.customer}>{order.customer?.name || 'Customer'}</div>
        <div className={r.address}><MapPin size={16} aria-hidden /> <span>{order.deliveryAddress}</span></div>
        <div className={r.meta}>
          <span><Package size={14} aria-hidden /> {count} item{count === 1 ? '' : 's'}</span>
          <span><strong>{formatNaira(order.total)}</strong></span>
          <span>{order.paymentMethod}</span>
        </div>
        {cash && order.status < 4 && (
          <div className={r.cash}><Banknote size={20} aria-hidden /> Collect {formatNaira(order.total)} cash</div>
        )}
      </Link>
    </li>
  );
}

export default function DeliveriesPage() {
  const [params, setParams] = useSearchParams();
  const scope: DeliveryScope = params.get('tab') === 'completed' ? 'completed' : 'active';
  const { data, error, loading, reload } = useLoad(() => riderApi.orders(scope), [scope], riderErrorMessage);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => { if (data) setUpdatedAt(new Date()); }, [data]);
  useAutoRefresh(() => { void reload(); });

  const setScope = (next: DeliveryScope) => {
    const p = new URLSearchParams(params);
    if (next === 'completed') p.set('tab', 'completed');
    else p.delete('tab');
    setParams(p, { replace: true });
  };

  const orders = data ?? [];

  return (
    <>
      <div className={r.row}>
        <div className={r.tabs} role="tablist" aria-label="Deliveries">
          {(['active', 'completed'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={scope === key}
              className={cx(r.tab, scope === key && r.tabActive)}
              onClick={() => setScope(key)}
            >
              {key === 'active' ? 'Active' : 'Completed'}
            </button>
          ))}
        </div>
        <Button className={r.refresh} onClick={() => void reload()} busy={loading && !!data} aria-label="Refresh" title="Refresh">
          {!(loading && data) && <RefreshCw size={20} aria-hidden />}
        </Button>
      </div>
      {updatedAt && (
        <p className={r.updated} aria-live="polite">
          Updated {updatedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · refreshes every 20 s
        </p>
      )}
      <ErrorBanner message={error} onRetry={() => void reload()} />
      {loading && !data ? <Loading label="Loading deliveries…" /> : orders.length === 0 ? (
        <div className={r.empty}>
          {scope === 'active' ? 'No active deliveries right now. New assignments appear here automatically.' : 'No completed deliveries yet.'}
        </div>
      ) : (
        <ul className={r.list}>
          {orders.map((o) => <OrderCard key={o.id} order={o} />)}
        </ul>
      )}
    </>
  );
}
