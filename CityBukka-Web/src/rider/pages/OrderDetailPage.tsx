import { Banknote, Bike, CheckCircle2, ChevronLeft, MapPin, Navigation, Phone, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button, ConfirmDialog, cx, ErrorBanner, Loading } from '../../admin/ui';
import { useLoad } from '../../admin/useLoad';
import { formatNaira } from '../../lib/format';
import r from '../rider.module.css';
import { RiderApiError, riderApi, riderErrorMessage } from '../riderApi';
import {
  DELIVERED, isCashOnDelivery, mapsUrl, OUT_FOR_DELIVERY, RIDER_ASSIGNED, type RiderOrder,
} from '../types';
import { StatusChip } from './DeliveriesPage';

const digits = (phone: string) => phone.replace(/[^\d+]/g, '');

function CallButtons({ order }: { order: RiderOrder }) {
  const account = order.customer?.phone?.trim() || '';
  const contact = order.contactPhone?.trim() || '';
  const numbers: Array<{ phone: string; label: string }> = [];
  if (contact) numbers.push({ phone: contact, label: 'Delivery contact' });
  if (account && digits(account) !== digits(contact)) numbers.push({ phone: account, label: 'Customer account' });
  if (numbers.length === 0) return <p className={r.updated}>No phone number on this order.</p>;
  return (
    <div className={r.callGrid}>
      {numbers.map(({ phone, label }) => (
        <a key={phone} className={cx(r.bigBtn, r.call)} href={`tel:${digits(phone)}`} aria-label={`Call ${phone} (${label})`}>
          <Phone size={22} aria-hidden />
          <span>Call {phone}<small>{label}</small></span>
        </a>
      ))}
    </div>
  );
}

export default function OrderDetailPage() {
  const { id = '' } = useParams();
  const { data: order, setData, error, loading, reload } = useLoad(() => riderApi.order(id), [id], riderErrorMessage);
  const [busy, setBusy] = useState<'pickup' | 'deliver' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeliver, setConfirmDeliver] = useState(false);

  async function act(kind: 'pickup' | 'deliver') {
    setBusy(kind);
    setActionError(null);
    try {
      const updated = kind === 'pickup' ? await riderApi.pickup(id) : await riderApi.deliver(id);
      if (updated && typeof updated === 'object' && 'status' in updated) setData(updated);
      else await reload();
      setConfirmDeliver(false);
    } catch (err) {
      setActionError(riderErrorMessage(err));
      setConfirmDeliver(false);
      // 409: the order moved on elsewhere (e.g. admin unassigned / advanced it) – show its real state.
      if (err instanceof RiderApiError && err.status === 409) void reload();
    } finally {
      setBusy(null);
    }
  }

  const cash = order ? isCashOnDelivery(order.paymentMethod) : false;

  return (
    <>
      <Link to="/rider" className={r.back}><ChevronLeft size={18} aria-hidden /> Deliveries</Link>
      <ErrorBanner message={error} onRetry={() => void reload()} />
      {loading && !order && <Loading label="Loading order…" />}
      {order && (
        <>
          <section className={r.section}>
            <div className={r.cardTop}>
              <h1 className={r.title}>#{order.id}</h1>
              <StatusChip status={order.status} />
            </div>
            <div className={r.customer}>{order.customer?.name || 'Customer'}</div>
            <CallButtons order={order} />
          </section>

          <section className={r.section}>
            <h2 className={r.sectionTitle}>Deliver to</h2>
            <div className={r.address} style={{ fontSize: 17, color: 'var(--a-text)' }}>
              <MapPin size={20} aria-hidden /> <span>{order.deliveryAddress}</span>
            </div>
            <a className={cx(r.bigBtn, r.maps)} href={mapsUrl(order.deliveryAddress)} target="_blank" rel="noopener noreferrer">
              <Navigation size={20} aria-hidden /> Open in Maps
            </a>
          </section>

          <section className={r.section}>
            <h2 className={r.sectionTitle}>Items</h2>
            <ul className={r.items}>
              {order.items.map((item) => {
                const unit = item.foodItem.price + item.selectedOptions.reduce((sum, o) => sum + o.extraPrice, 0);
                return (
                  <li key={item.id}>
                    <div>
                      <span className={r.qty}>{item.quantity}×</span>
                      <span className={r.itemName}>{item.foodItem.name}</span>
                      {item.selectedOptions.length > 0 && (
                        <span className={r.itemExtra}>{item.selectedOptions.map((o) => o.name).join(', ')}</span>
                      )}
                      {item.specialInstructions && <span className={r.itemExtra}>“{item.specialInstructions}”</span>}
                    </div>
                    <span>{formatNaira(unit * item.quantity)}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={r.section}>
            <h2 className={r.sectionTitle}>Payment</h2>
            <dl className={r.totals}>
              <dt>Subtotal</dt><dd>{formatNaira(order.subtotal)}</dd>
              <dt>Delivery fee</dt><dd>{formatNaira(order.deliveryFee)}</dd>
              {order.serviceFee > 0 && (<><dt>Service fee</dt><dd>{formatNaira(order.serviceFee)}</dd></>)}
              {order.packagingFee > 0 && (<><dt>Packaging</dt><dd>{formatNaira(order.packagingFee)}</dd></>)}
              {order.discount > 0 && (<><dt>Discount</dt><dd>−{formatNaira(order.discount)}</dd></>)}
              <dt className={r.grand}>Total</dt><dd className={r.grand}>{formatNaira(order.total)}</dd>
              <dt>Payment method</dt><dd>{order.paymentMethod}</dd>
            </dl>
            {cash && order.status < DELIVERED && (
              <div className={r.cash}><Banknote size={20} aria-hidden /> Collect {formatNaira(order.total)} cash</div>
            )}
          </section>

          <ErrorBanner message={actionError} />

          {(order.status === RIDER_ASSIGNED || order.status === OUT_FOR_DELIVERY) && (
            <div className={r.actionBar}>
              {order.status === RIDER_ASSIGNED ? (
                <button type="button" className={cx(r.bigBtn, r.primaryBtn)} disabled={!!busy} onClick={() => void act('pickup')}>
                  <Bike size={22} aria-hidden /> {busy === 'pickup' ? 'Starting…' : 'Picked up — start delivery'}
                </button>
              ) : (
                <button type="button" className={cx(r.bigBtn, r.successBtn)} disabled={!!busy} onClick={() => setConfirmDeliver(true)}>
                  <CheckCircle2 size={22} aria-hidden /> Mark delivered
                </button>
              )}
            </div>
          )}

          {order.status >= DELIVERED && (
            <Button onClick={() => void reload()} busy={loading}><RefreshCw size={16} aria-hidden /> Refresh</Button>
          )}

          {confirmDeliver && (
            <ConfirmDialog
              title="Mark as delivered?"
              confirmLabel="Yes, delivered"
              confirmVariant="primary"
              busy={busy === 'deliver'}
              message={cash
                ? <>Confirm you handed over order <strong>#{order.id}</strong> and collected <strong>{formatNaira(order.total)}</strong> cash.</>
                : <>Confirm you handed over order <strong>#{order.id}</strong> to the customer.</>}
              onConfirm={() => void act('deliver')}
              onCancel={() => setConfirmDeliver(false)}
            />
          )}
        </>
      )}
    </>
  );
}
