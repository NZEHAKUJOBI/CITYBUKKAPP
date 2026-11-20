import { Bike, Check, CreditCard, Phone, ReceiptText, User, WifiOff, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/small';
import { Screen } from '../../layout/layout';
import { errorMessage } from '../../data/client';
import { formatNaira, isOrderActive, ORDER_STATUS_INFO } from '../../lib/format';
import { formatPhone, telHref } from '../../lib/phone';
import { LoadingScreen } from '../../state/AuthContext';
import { useOrders } from '../../state/OrdersContext';
import { useToast } from '../../state/ToastContext';
import { OrderStatus, type Order, type OrderRider } from '../../types';
import { Modal } from './Modal';
import styles from './OrderTrackingScreen.module.css';

const dateFormat = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

const POLL_MS = 15_000;

/** Port of OrderTrackingScreen – GET /api/orders/:id, refreshed every 15 s while the order is active. */
export function OrderTrackingScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { getOrder, fetchOrder, cancelOrder } = useOrders();
  const toast = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>(() => (getOrder(id) ? 'ready' : 'loading'));
  const closeConfirm = useCallback(() => setConfirmCancel(false), []);
  const order = getOrder(id);
  const active = order ? isOrderActive(order.status) : true;

  const load = useCallback(async () => {
    try {
      const found = await fetchOrder(id);
      setState(found ? 'ready' : 'missing');
    } catch {
      // Keep showing what we have; only an empty screen becomes an error.
      setState((s) => (s === 'ready' ? s : 'error'));
    }
  }, [id, fetchOrder]);

  useEffect(() => { void load(); }, [load]);

  // Live updates while the order is on its way.
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState !== 'hidden') void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [active, load]);

  // Flutter's back button always returns to the Orders tab.
  const back = () => navigate('/orders');

  if (!order) {
    if (state === 'loading') {
      return (
        <Screen header={<PageHeader title="Track Order" onBack={back} />}>
          <LoadingScreen label="Loading order" />
        </Screen>
      );
    }
    return (
      <Screen header={<PageHeader title="Track Order" onBack={back} />}>
        {state === 'error' ? (
          <EmptyState
            icon={<WifiOff size={56} />}
            title="Can't load this order"
            message="We couldn't reach CityBukka. Check your connection and try again."
            buttonText="Try again"
            onButtonClick={() => { setState('loading'); void load(); }}
          />
        ) : (
          <EmptyState
            icon={<ReceiptText size={56} />}
            title="Order Not Found"
            message={`We couldn't find order #${id} on your account.`}
            buttonText="View My Orders"
            onButtonClick={back}
          />
        )}
      </Screen>
    );
  }

  const isCancelled = order.status === OrderStatus.cancelled;
  const isDelivered = order.status === OrderStatus.delivered;
  const info = ORDER_STATUS_INFO[order.status];

  const doCancel = async () => {
    setConfirmCancel(false);
    setCancelling(true);
    try {
      await cancelOrder(order.id);
      toast('Order cancelled.', 'success');
    } catch (err) {
      toast(errorMessage(err, 'This order can no longer be cancelled.'), 'error');
      void load();
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Screen header={<PageHeader title={`Track Order #${order.id}`} onBack={back} />}>
      <div className={styles.page}>
        <div className={styles.mainCol}>
          <section className={`${styles.hero} ${isCancelled ? styles.heroCancelled : ''} ${isDelivered ? styles.heroDelivered : ''}`} aria-live="polite">
            <div className={styles.heroTop}>
              <span className={styles.heroTag}>{isCancelled ? 'ORDER STATUS' : 'ESTIMATED DELIVERY'}</span>
              <span className={styles.heroIcon}>
                {isCancelled ? <XCircle size={26} aria-hidden /> : <Bike size={26} aria-hidden />}
              </span>
            </div>
            <p className={styles.heroTitle}>
              {isCancelled ? 'Order Cancelled' : isDelivered ? 'Meal Delivered 🎉' : `${order.estimatedDeliveryMinutes} Minutes`}
            </p>
            <p className={styles.heroText}>{info.description}</p>
          </section>

          {!isCancelled && (
            <section aria-labelledby="progress-title" className={styles.card}>
              <h2 id="progress-title" className={styles.sectionTitle}>Live Bukka Progress</h2>
              <Timeline order={order} />
            </section>
          )}
        </div>

        <div className={styles.sideCol}>
          {order.rider && !isCancelled && <RiderCard rider={order.rider} />}

          <section className={styles.card} aria-label="Order summary">
            <div className={styles.summaryRow}>
              <h2 className={styles.summaryLabel}>Delivery Address</h2>
              <span className={styles.summaryTotal}>{formatNaira(order.total)}</span>
            </div>
            <p className={styles.summaryAddress}>{order.deliveryAddress}</p>
            {order.contactPhone && (
              <p className={styles.summaryMeta}>
                <Phone size={14} aria-hidden /> Contact: {formatPhone(order.contactPhone)}
              </p>
            )}
            <ul className={styles.summaryItems}>
              {order.items.map((item) => (
                <li key={item.id}>
                  <span className={styles.summaryQty}>{item.quantity}×</span>
                  <span className="ellipsis">{item.foodItem.name}</span>
                </li>
              ))}
            </ul>
            <p className={styles.summaryMeta}>
              <CreditCard size={14} aria-hidden /> {isCancelled ? 'Payment method:' : 'Paid via'} {order.paymentMethod}
            </p>
            <p className={styles.summaryMeta}>
              Placed <time dateTime={order.createdAt}>{dateFormat.format(new Date(order.createdAt))}</time>
            </p>
          </section>

          {order.status === OrderStatus.placed && (
            <Button variant="outlined" fullWidth className={styles.cancel} loading={cancelling} onClick={() => setConfirmCancel(true)}>
              Cancel order
            </Button>
          )}
        </div>
      </div>

      {confirmCancel && (
        <Modal
          title="Cancel this order?"
          onClose={closeConfirm}
          actions={
            <>
              <Button variant="outlined" height={42} onClick={closeConfirm}>Keep order</Button>
              <Button height={42} className={styles.danger} onClick={() => void doCancel()}>Yes, cancel</Button>
            </>
          }
        >
          Order #{order.id} hasn&apos;t been prepared yet, so you can still cancel it.
        </Modal>
      )}
    </Screen>
  );
}

function Timeline({ order }: { order: Order }) {
  const steps = [
    { status: OrderStatus.placed, title: 'Order Placed & Confirmed', sub: 'Bukka notified' },
    { status: OrderStatus.preparing, title: 'Bukka Kitchen Sizzling', sub: 'Chefs are cooking over firewood' },
    { status: OrderStatus.riderAssigned, title: 'Rider Assigned', sub: order.rider ? `${order.rider.name} is on the job` : 'Finding you a rider' },
    { status: OrderStatus.outForDelivery, title: 'Out for Delivery', sub: 'Cruising on motorbike to your address' },
    { status: OrderStatus.delivered, title: 'Delivered', sub: 'Enjoy your authentic feast!' },
  ];
  const current = ORDER_STATUS_INFO[order.status].step;

  return (
    <ol className={styles.timeline}>
      {steps.map((s, i) => {
        const step = ORDER_STATUS_INFO[s.status].step;
        const done = step < current;
        const isCurrent = step === current;
        const state = done ? 'completed' : isCurrent ? 'current' : 'upcoming';
        return (
          <li
            key={s.status}
            className={`${styles.step} ${step <= current ? styles.stepReached : ''} ${done ? styles.stepDone : ''}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className={styles.stepMarker} aria-hidden>
              <span className={styles.stepCircle}>
                {done ? <Check size={16} /> : isCurrent ? <span className={styles.stepSpinner} /> : i + 1}
              </span>
              {i < steps.length - 1 && <span className={styles.stepLine} />}
            </span>
            <span className={styles.stepText}>
              <span className={styles.stepTitle}>{s.title}</span>
              <span className="visually-hidden"> ({state})</span>
              <span className={styles.stepSub}>{s.sub}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function RiderCard({ rider }: { rider: OrderRider }) {
  return (
    <section className={`${styles.card} ${styles.rider}`} aria-label="Your rider">
      <span className={styles.riderAvatar} aria-hidden><User size={28} /></span>
      <div className={styles.riderInfo}>
        <div className={styles.riderNameRow}>
          <span className={`${styles.riderName} ellipsis`}>{rider.name}</span>
        </div>
        <span className={styles.riderVehicle}>
          {[rider.vehicle, rider.phone && formatPhone(rider.phone)].filter(Boolean).join(' · ') || 'Your CityBukka rider'}
        </span>
      </div>
      {rider.phone && (
        <a href={telHref(rider.phone)} className={styles.call} aria-label={`Call ${rider.name}`}>
          <Phone size={18} aria-hidden />
        </a>
      )}
    </section>
  );
}
