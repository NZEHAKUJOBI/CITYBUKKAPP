import { History, Navigation, ReceiptText, RotateCcw, UtensilsCrossed, WifiOff } from 'lucide-react';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { errorMessage } from '../../data/client';
import { LoadingScreen } from '../../state/AuthContext';
import { useCart } from '../../state/CartContext';
import { EmptyState, FallbackImage } from '../../components/small';
import { Screen } from '../../layout/layout';
import { formatNaira, ORDER_STATUS_INFO } from '../../lib/format';
import { OrderStatus } from '../../types';
import { useOrders } from '../../state/OrdersContext';
import { useToast } from '../../state/ToastContext';
import type { Order } from '../../types';
import styles from './OrdersScreen.module.css';

type Tab = 'active' | 'past';
const dateFormat = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const TABS: { id: Tab; label: string }[] = [
  { id: 'active', label: 'Active Feasts' },
  { id: 'past', label: 'Order History' },
];

/** Port of OrdersScreen: "My Orders" with Active / History tabs. */
export function OrdersScreen() {
  const { activeOrders, pastOrders, loading, error, refresh } = useOrders();

  // Refresh when the tab is opened so statuses are current.
  useEffect(() => { void refresh(); }, [refresh]);
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
        {loading && list.length === 0 ? (
          <LoadingScreen label="Loading orders" />
        ) : error && list.length === 0 ? (
          <EmptyState
            icon={<WifiOff size={56} />}
            title="Can't load your orders"
            message={errorMessage(error)}
            buttonText="Try again"
            onButtonClick={() => void refresh()}
          />
        ) : list.length === 0 ? (
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
  const { addItem } = useCart();
  const navigate = useNavigate();
  const info = ORDER_STATUS_INFO[order.status];

  const reorder = () => {
    for (const item of order.items) {
      addItem({
        foodItem: item.foodItem,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions,
        specialInstructions: item.specialInstructions,
      });
    }
    toast('Items added to your Bukka bag. Prices are re-checked at checkout.', 'success');
    navigate('/bag');
  };
  const to = `/orders/${order.id}`;
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
  const statusClass = isActive
    ? styles.statusActive
    : order.status === OrderStatus.cancelled ? styles.statusCancelled : styles.statusPast;

  return (
    <article className={`${styles.card} ${isActive ? styles.cardActive : ''}`}>
      <div className={styles.row}>
        <div className={styles.idCol}>
          {/* The link's ::after covers the whole card, so tapping anywhere opens the order. */}
          <Link to={to} className={styles.cardLink}>Order #{order.id}</Link>
          <time className={styles.date} dateTime={order.createdAt}>{dateFormat.format(new Date(order.createdAt))}</time>
        </div>
        <span className={`${styles.status} ${statusClass}`}>{info.title}</span>
      </div>

      {itemCount > 0 && (
        <div className={styles.itemsRow}>
          <div className={styles.thumbs} aria-hidden>
            {order.items.slice(0, 3).map((item) => (
              <FallbackImage key={item.id} src={item.foodItem.imageUrl} alt="" className={styles.thumb}
                fallbackIcon={<UtensilsCrossed size={16} />} />
            ))}
          </div>
          <p className={`${styles.itemsText} clamp-2`}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'} · {order.items.map((i) => i.foodItem.name).join(', ')}
          </p>
        </div>
      )}

      <p className={`${styles.address} ellipsis`}>{order.deliveryAddress}</p>

      <div className={`${styles.row} ${styles.footRow}`}>
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
            onClick={reorder}
            disabled={itemCount === 0}
          >
            <RotateCcw size={15} aria-hidden /> Re-order
          </button>
        )}
      </div>
    </article>
  );
}
