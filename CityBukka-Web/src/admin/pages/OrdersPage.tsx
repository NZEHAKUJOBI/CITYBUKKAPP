import { Bike, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useSearchParams } from 'react-router';
import { formatNaira } from '../../lib/format';
import { adminApi, errorMessage } from '../adminApi';
import { STATUS_KEYS, STATUS_LABELS, type AdminOrder } from '../types';
import {
  Button, Drawer, Empty, ErrorBanner, formatDateTime, Loading, PageHead, SearchInput, StatusBadge, styles as s, useDebounced,
} from '../ui';
import { useLoad } from '../useLoad';

const PAGE_SIZE = 25;
const DELIVERED = 4;
const CANCELLED = 5;
const PREPARING = 1;
const RIDER_ASSIGNED = 2;
/** Statuses the Advance button handles. Preparing -> rider assigned happens through "Assign rider" instead. */
const NEXT_LABEL: Record<number, string> = {
  0: 'Start preparing',
  2: 'Out for delivery',
  3: 'Mark delivered',
};

const isActive = (status: number) => status !== DELIVERED && status !== CANCELLED;
/** A rider can be (re)assigned until the order is picked up. */
const canAssign = (status: number) => status <= RIDER_ASSIGNED;

export function customerOf(o: AdminOrder) {
  return {
    name: o.customer?.name || o.customerName || null,
    phone: o.customer?.phone || o.customerPhone || null,
  };
}

export function riderOf(o: AdminOrder) {
  if (o.rider) return o.rider;
  if (o.riderName) return { id: '', name: o.riderName, phone: o.riderPhone ?? '', vehicle: o.riderVehicle };
  return null;
}

function AssignRider({ order, onAssigned }: { order: AdminOrder; onAssigned: (o: AdminOrder) => void }) {
  const selectId = useId();
  const riders = useLoad(() => adminApi.riders.list(), []);
  const current = riderOf(order);
  const [riderId, setRiderId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = (riders.data ?? []).filter((r) => r.isActive && r.id !== current?.id);
  const loadingRiders = riders.loading && !riders.data;

  async function assign() {
    if (!riderId) return;
    setBusy(true);
    setError(null);
    try {
      onAssigned(await adminApi.orders.assign(order.id, riderId));
      setRiderId('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={s.panel} style={{ margin: '12px 0' }} aria-label="Assign rider">
      <h3 className={s.panelTitle} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Bike size={16} aria-hidden /> {current ? 'Change rider' : 'Assign a rider'}
      </h3>
      {order.status === PREPARING && !current && (
        <p className={s.muted} style={{ marginTop: 0 }}>The kitchen is preparing this order. Assign a rider to move it on.</p>
      )}
      <ErrorBanner message={riders.error} onRetry={() => void riders.reload()} />
      <ErrorBanner message={error} />
      <div className={s.toolbar} style={{ margin: 0 }}>
        <label htmlFor={selectId} className={s.srOnly}>Rider</label>
        <select id={selectId} className={s.input} style={{ flex: '1 1 180px', width: 'auto' }} value={riderId}
          disabled={loadingRiders} onChange={(e) => setRiderId(e.target.value)}>
          <option value="">
            {loadingRiders ? 'Loading riders…' : options.length ? 'Choose an active rider…' : 'No active riders available'}
          </option>
          {options.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {r.vehicle}{r.activeOrders ? ` · ${r.activeOrders} active` : ''}
            </option>
          ))}
        </select>
        <Button variant="primary" busy={busy} disabled={!riderId} onClick={() => void assign()}>Assign rider</Button>
      </div>
    </section>
  );
}

function OrderDetail({ orderId, onClose, onChanged }:
  { orderId: string; onClose: () => void; onChanged: (o: AdminOrder) => void }) {
  const { data: order, setData, error, loading, reload } = useLoad(() => adminApi.orders.get(orderId), [orderId]);
  const [busy, setBusy] = useState<'advance' | 'cancel' | 'unassign' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function act(kind: 'advance' | 'cancel' | 'unassign') {
    setBusy(kind);
    setActionError(null);
    try {
      const updated = kind === 'advance' ? await adminApi.orders.advance(orderId)
        : kind === 'cancel' ? await adminApi.orders.cancel(orderId)
          : await adminApi.orders.unassign(orderId);
      setData(updated);
      onChanged(updated);
      setConfirmCancel(false);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const active = order ? isActive(order.status) : false;
  const nextLabel = order ? NEXT_LABEL[order.status] : undefined;
  const customer = order ? customerOf(order) : null;
  const rider = order ? riderOf(order) : null;
  const changed = (updated: AdminOrder) => { setData(updated); onChanged(updated); setActionError(null); };

  return (
    <Drawer
      title={`Order ${orderId}`}
      onClose={onClose}
      footer={order && active ? (
        confirmCancel ? (
          <>
            <span className={s.muted} style={{ marginRight: 'auto', alignSelf: 'center' }}>Cancel this order?</span>
            <Button onClick={() => setConfirmCancel(false)}>Keep</Button>
            <Button variant="danger" busy={busy === 'cancel'} onClick={() => void act('cancel')}>Yes, cancel</Button>
          </>
        ) : (
          <>
            <Button variant="danger" disabled={!!busy} onClick={() => setConfirmCancel(true)}>Cancel order</Button>
            {nextLabel ? (
              <Button variant="primary" busy={busy === 'advance'} disabled={!!busy} onClick={() => void act('advance')}>
                {nextLabel}
              </Button>
            ) : (
              <span className={s.muted} style={{ alignSelf: 'center' }}>Assign a rider to continue</span>
            )}
          </>
        )
      ) : undefined}
    >
      <ErrorBanner message={error} onRetry={() => void reload()} />
      <ErrorBanner message={actionError} />
      {loading && !order && <Loading />}
      {order && (
        <>
          <dl className={s.kv}>
            <dt>Status</dt><dd><StatusBadge status={order.status} /></dd>
            <dt>Placed</dt><dd>{formatDateTime(order.createdAt)}</dd>
            {order.updatedAt && (<><dt>Updated</dt><dd>{formatDateTime(order.updatedAt)}</dd></>)}
            <dt>Customer</dt>
            <dd>
              {customer?.name || order.userId || '—'}
              {customer?.phone && <> · <a href={`tel:${customer.phone}`}>{customer.phone}</a></>}
            </dd>
            {order.contactPhone && order.contactPhone !== customer?.phone && (
              <><dt>Contact phone</dt><dd><a href={`tel:${order.contactPhone}`}>{order.contactPhone}</a></dd></>
            )}
            <dt>Deliver to</dt><dd>{order.deliveryAddress}</dd>
            <dt>Payment</dt><dd>{order.paymentMethod}</dd>
            <dt>ETA</dt><dd>{order.estimatedDeliveryMinutes} min</dd>
            <dt>Rider</dt>
            <dd>
              {rider ? (
                <>
                  {rider.name}
                  {rider.phone && <> · <a href={`tel:${rider.phone}`}>{rider.phone}</a></>}
                  {rider.vehicle ? ` · ${rider.vehicle}` : ''}
                  {order.status === RIDER_ASSIGNED && (
                    <>
                      {' '}
                      <Button small variant="ghost" busy={busy === 'unassign'} disabled={!!busy} onClick={() => void act('unassign')}>
                        Unassign
                      </Button>
                    </>
                  )}
                </>
              ) : <span className={s.muted}>Not assigned</span>}
            </dd>
            {order.promoCode && (<><dt>Promo</dt><dd>{order.promoCode}</dd></>)}
          </dl>

          {canAssign(order.status) && <AssignRider order={order} onAssigned={changed} />}

          <h3 className={s.panelTitle}>Items</h3>
          <ul className={s.lineItems}>
            {order.items.map((item) => {
              const unit = item.foodItem.price + item.selectedOptions.reduce((sum, o) => sum + o.extraPrice, 0);
              return (
                <li key={item.id}>
                  <div>
                    <strong>{item.quantity}× {item.foodItem.name}</strong>
                    {item.selectedOptions.length > 0 && <small>{item.selectedOptions.map((o) => o.name).join(', ')}</small>}
                    {item.specialInstructions && <small>“{item.specialInstructions}”</small>}
                  </div>
                  <span className={s.num}>{formatNaira(unit * item.quantity)}</span>
                </li>
              );
            })}
          </ul>

          <dl className={s.kv}>
            <dt>Subtotal</dt><dd>{formatNaira(order.subtotal)}</dd>
            <dt>Delivery fee</dt><dd>{formatNaira(order.deliveryFee)}</dd>
            <dt>Service fee</dt><dd>{formatNaira(order.serviceFee)}</dd>
            <dt>Packaging</dt><dd>{formatNaira(order.packagingFee)}</dd>
            {order.discount > 0 && (<><dt>Discount</dt><dd>−{formatNaira(order.discount)}</dd></>)}
            <dt className={s.totalRow}>Total</dt><dd className={s.totalRow}>{formatNaira(order.total)}</dd>
          </dl>
        </>
      )}
    </Drawer>
  );
}

export default function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const q = useDebounced(query.trim());
  const openId = params.get('open');

  useEffect(() => setOffset(0), [status, q]);

  const { data, setData, error, loading, reload } = useLoad(
    () => adminApi.orders.list({ status: status === '' ? undefined : Number(status), q: q || undefined, limit: PAGE_SIZE, offset }),
    [status, q, offset],
  );

  const setOpen = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('open', id);
    else next.delete('open');
    setParams(next, { replace: true });
  };

  const onChanged = (updated: AdminOrder) =>
    setData((prev) => prev && { ...prev, items: prev.items.map((o) => (o.id === updated.id ? updated : o)) });

  const total = data?.total ?? 0;
  const rows = data?.items ?? [];

  return (
    <>
      <PageHead
        title="Orders"
        subtitle={data ? `${total} order${total === 1 ? '' : 's'}` : undefined}
        actions={<Button onClick={() => void reload()} busy={loading && !!data}><RefreshCw size={16} aria-hidden /> Refresh</Button>}
      />
      <div className={s.toolbar}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search order ID, customer, address…" label="Search orders" />
        <select className={s.input} style={{ width: 'auto', flex: '1 1 160px' }} aria-label="Filter by status"
          value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_KEYS.map((key, i) => <option key={key} value={i}>{STATUS_LABELS[key]}</option>)}
        </select>
      </div>
      <ErrorBanner message={error} onRetry={() => void reload()} />

      {loading && !data ? <Loading /> : rows.length === 0 ? (
        <div className={s.panel}><Empty>No orders found.</Empty></div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Order</th><th>Customer</th><th>Placed</th><th>Items</th><th>Address</th><th>Status</th><th>Rider</th>
                <th className={s.num}>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr
                  key={o.id}
                  className={s.clickable}
                  tabIndex={0}
                  onClick={() => setOpen(o.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setOpen(o.id); }}
                >
                  <td className={s.cardHead}><strong>{o.id}</strong></td>
                  <td data-label="Customer">
                    {customerOf(o).name || o.userId || '—'}
                    {(o.contactPhone || customerOf(o).phone) && (
                      <span className={s.muted}> · {o.contactPhone || customerOf(o).phone}</span>
                    )}
                  </td>
                  <td data-label="Placed">{formatDateTime(o.createdAt)}</td>
                  <td data-label="Items">{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                  <td data-label="Address">{o.deliveryAddress}</td>
                  <td data-label="Status"><StatusBadge status={o.status} /></td>
                  <td data-label="Rider">
                    {riderOf(o)?.name ?? (o.status === PREPARING ? <span className={s.muted}>Needs rider</span> : '—')}
                  </td>
                  <td data-label="Total" className={s.num}>{formatNaira(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className={s.pager}>
          <span>{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}</span>
          <div className={s.actions}>
            <Button small disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              <ChevronLeft size={14} aria-hidden /> Prev
            </Button>
            <Button small disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
              Next <ChevronRight size={14} aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {openId && <OrderDetail key={openId} orderId={openId} onClose={() => setOpen(null)} onChanged={onChanged} />}
    </>
  );
}
