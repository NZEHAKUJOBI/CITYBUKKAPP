import { Bike, Check, CreditCard, FastForward, Phone, ReceiptText, Star, User, XCircle } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/small';
import { Screen } from '../../layout/layout';
import { formatNaira, ORDER_STATUS_INFO } from '../../lib/format';
import { useOrders } from '../../state/OrdersContext';
import { useToast } from '../../state/ToastContext';
import { OrderStatus, type Order } from '../../types';
import { Modal } from './Modal';
import styles from './OrderTrackingScreen.module.css';

const dateFormat = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

/** Port of OrderTrackingScreen. */
export function OrderTrackingScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { getOrder, advanceOrder, cancelOrder } = useOrders();
  const toast = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const closeConfirm = useCallback(() => setConfirmCancel(false), []);
  const order = getOrder(id);

  // Flutter's back button always returns to the Orders tab.
  const back = () => navigate('/orders');

  if (!order) {
    return (
      <Screen header={<PageHeader title="Track Order" onBack={back} />}>
        <EmptyState
          icon={<ReceiptText size={56} />}
          title="Order Not Found"
          message={`We couldn't find order #${id}. It may have been removed from this device.`}
          buttonText="View My Orders"
          onButtonClick={back}
        />
      </Screen>
    );
  }

  const isCancelled = order.status === OrderStatus.cancelled;
  const isDelivered = order.status === OrderStatus.delivered;
  const info = ORDER_STATUS_INFO[order.status];

  const doCancel = () => {
    setConfirmCancel(false);
    if (cancelOrder(order.id)) toast('Order cancelled.', 'success');
    else toast('This order can no longer be cancelled.', 'error');
  };

  return (
    <Screen header={<PageHeader title={`Track Order #${order.id}`} onBack={back} />}>
      <div className={styles.page}>
        <section className={`${styles.hero} ${isCancelled ? styles.heroCancelled : ''}`} aria-live="polite">
          <div className={styles.heroTop}>
            <span className={styles.heroTag}>{isCancelled ? 'ORDER STATUS' : 'ESTIMATED DELIVERY'}</span>
            {isCancelled ? <XCircle size={28} aria-hidden /> : <Bike size={28} aria-hidden />}
          </div>
          <p className={styles.heroTitle}>
            {isCancelled ? 'Order Cancelled' : isDelivered ? 'Meal Delivered 🎉' : `${order.estimatedDeliveryMinutes} Minutes`}
          </p>
          <p className={styles.heroText}>{info.description}</p>
        </section>

        {!isCancelled && (
          <section aria-labelledby="progress-title">
            <h2 id="progress-title" className={styles.sectionTitle}>Live Bukka Progress</h2>
            <Timeline order={order} />
          </section>
        )}

        {order.riderName && !isCancelled && <RiderCard order={order} />}

        <section className={styles.card} aria-label="Order summary">
          <div className={styles.summaryRow}>
            <h2 className={styles.summaryLabel}>Delivery Address</h2>
            <span className={styles.summaryTotal}>{formatNaira(order.total)}</span>
          </div>
          <p className={styles.summaryAddress}>{order.deliveryAddress}</p>
          <p className={styles.summaryMeta}>
            <CreditCard size={14} aria-hidden /> {isCancelled ? 'Payment method:' : 'Paid via'} {order.paymentMethod}
          </p>
          <p className={styles.summaryMeta}>
            Placed <time dateTime={order.createdAt}>{dateFormat.format(new Date(order.createdAt))}</time>
          </p>
        </section>

        {order.status === OrderStatus.placed && (
          <Button variant="outlined" fullWidth className={styles.cancel} onClick={() => setConfirmCancel(true)}>
            Cancel order
          </Button>
        )}

        {!isDelivered && !isCancelled && (
          <Button
            variant="outlined"
            fullWidth
            icon={<FastForward size={18} aria-hidden />}
            onClick={() => advanceOrder(order.id)}
          >
            Simulate Next Delivery Stage 🚀
          </Button>
        )}
      </div>

      {confirmCancel && (
        <Modal
          title="Cancel this order?"
          onClose={closeConfirm}
          actions={
            <>
              <Button variant="outlined" height={42} onClick={closeConfirm}>Keep order</Button>
              <Button height={42} className={styles.danger} onClick={doCancel}>Yes, cancel</Button>
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
    { status: OrderStatus.riderAssigned, title: 'Rider Assigned', sub: `${order.riderName ?? 'Driver'} dispatched` },
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

function RiderCard({ order }: { order: Order }) {
  const rating = order.riderRating ?? 4.9;
  return (
    <section className={`${styles.card} ${styles.rider}`} aria-label="Your rider">
      <span className={styles.riderAvatar} aria-hidden><User size={28} /></span>
      <div className={styles.riderInfo}>
        <div className={styles.riderNameRow}>
          <span className={`${styles.riderName} ellipsis`}>{order.riderName}</span>
          <span className={styles.riderRating} aria-label={`Rated ${rating}`}>
            <Star size={10} fill="#d97706" color="#d97706" aria-hidden />
            {rating}
          </span>
        </div>
        <span className={styles.riderVehicle}>{order.riderVehicle ?? 'Motorbike'}</span>
      </div>
      {order.riderPhone && (
        <a href={`tel:${order.riderPhone.replace(/[^\d+]/g, '')}`} className={styles.call} aria-label={`Call ${order.riderName}`}>
          <Phone size={18} aria-hidden />
        </a>
      )}
    </section>
  );
}
