import { History, Navigation, ReceiptText } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { EmptyState } from '../../components/small';
import { Screen } from '../../layout/layout';
import { formatNaira, ORDER_STATUS_INFO } from '../../lib/format';
import { useOrders } from '../../state/OrdersContext';
import { useToast } from '../../state/ToastContext';
import type { Order } from '../../types';
import styles from './OrdersScreen.module.css';

type Tab = 'active' | 'past';
const TABS: { id: Tab; label: string }[] = [
  { id: 'active', label: 'Active Feasts' },
  { id: 'past', label: 'Order History' },
];

/** Port of OrdersScreen: "My Orders" with Active / History tabs. */
export function OrdersScreen() {
  const { activeOrders, pastOrders } = useOrders();
  const [tab, setTab] = useState<Tab>('active');

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const next: Tab = tab === 'active' ? 'past' : 'active';
      setTab(next);
      document.getElementById(`orders-tab-${next}`)?.focus();
    }
  };

  const list = tab === 'active' ? activeOrders : pastOrders;

  return (
    <Screen
      header={
        <header className={styles.header}>
          <h1 className={styles.title}>My Orders</h1>
          <div role="tablist" aria-label="Orders" className={styles.tabs} onKeyDown={onTabKey}>
            {TABS.map((t) => (
              <button
                key={t.id}
                id={`orders-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls="orders-panel"
                tabIndex={tab === t.id ? 0 : -1}
                className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>
      }
    >
      <div id="orders-panel" role="tabpanel" aria-labelledby={`orders-tab-${tab}`} className={styles.panel}>
        {list.length === 0 ? (
          tab === 'active' ? (
            <EmptyState
              icon={<ReceiptText size={56} />}
              title="No Active Orders"
              message="Hungry? Place an order and follow your food in real-time from the Bukka stove to your door."
            />
          ) : (
            <EmptyState
              icon={<History size={56} />}
              title="No Past Orders Yet"
              message="Your completed feasts and receipts will appear right here."
            />
          )
        ) : (
          <ul className={styles.list}>
            {list.map((o) => (
              <li key={o.id}><OrderCard order={o} isActive={tab === 'active'} /></li>
            ))}
          </ul>
        )}
      </div>
    </Screen>
  );
}

function OrderCard({ order, isActive }: { order: Order; isActive: boolean }) {
  const toast = useToast();
  const info = ORDER_STATUS_INFO[order.status];
  const to = `/orders/${order.id}`;

  return (
    <article className={styles.card}>
      <div className={styles.row}>
        {/* The link's ::after covers the whole card, so tapping anywhere opens the order. */}
        <Link to={to} className={styles.cardLink}>Order #{order.id}</Link>
        <span className={`${styles.status} ${isActive ? styles.statusActive : styles.statusPast}`}>{info.title}</span>
      </div>
      <p className={`${styles.address} ellipsis`}>{order.deliveryAddress}</p>
      <div className={styles.row}>
        <div>
          <p className={styles.totalLabel}>Total Paid</p>
          <p className={styles.total}>{formatNaira(order.total)}</p>
        </div>
        {isActive ? (
          <Link to={to} className={styles.track}>
            <Navigation size={16} aria-hidden /> Track Live
          </Link>
        ) : (
          <button
            type="button"
            className={styles.reorder}
            onClick={() => toast('Re-order feature: Items added to your Bukka bag!')}
          >
            Re-order
          </button>
        )}
      </div>
    </article>
  );
}
