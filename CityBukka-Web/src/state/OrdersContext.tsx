import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import type { PaymentMethod } from '../config/constants';
import { riders } from '../data/mockData';
import { isOrderActive } from '../lib/format';
import { computeTotals } from '../lib/pricing';
import { OrderStatus, type CartItem, type Order } from '../types';
import { usePersistentState } from './persist';

interface PlaceOrderInput {
  items: CartItem[];
  promoCode: string | null;
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
}

interface OrdersContextValue {
  orders: Order[];
  activeOrders: Order[];
  pastOrders: Order[];
  getOrder(id: string): Order | undefined;
  /** Totals are recomputed here from the items, never taken from the UI. */
  placeOrder(input: PlaceOrderInput): Promise<Order>;
  /** Demo control: move an order one step along the delivery flow. */
  advanceOrder(id: string): void;
  /** Allowed only while the order is still 'placed'. Returns false otherwise. */
  cancelOrder(id: string): boolean;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.placed]: OrderStatus.preparing,
  [OrderStatus.preparing]: OrderStatus.riderAssigned,
  [OrderStatus.riderAssigned]: OrderStatus.outForDelivery,
  [OrderStatus.outForDelivery]: OrderStatus.delivered,
};

/** Same sample order the Flutter app starts with. */
function sampleOrders(): Order[] {
  const rider = riders.find((r) => r.id === 'rider_chidi')!;
  return [{
    id: 'CB-94821',
    items: [],
    subtotal: 7400, deliveryFee: 650, serviceFee: 200, packagingFee: 150, discount: 0, total: 8400,
    status: OrderStatus.outForDelivery,
    createdAt: new Date(Date.now() - 18 * 60_000).toISOString(),
    deliveryAddress: 'Shiroro Road by Unity Block, Minna',
    paymentMethod: 'CityPay Wallet',
    riderName: rider.name, riderPhone: rider.phone, riderVehicle: rider.vehicle, riderRating: rider.rating,
    estimatedDeliveryMinutes: 12,
  }];
}

const newOrderId = () => `CB-${Math.floor(100000 + Math.random() * 900000)}`;

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = usePersistentState<Order[]>('orders', sampleOrders);

  const placeOrder = useCallback(async (input: PlaceOrderInput) => {
    await new Promise((r) => setTimeout(r, 600)); // simulated network round-trip
    const totals = computeTotals(input.items, input.promoCode);
    const prep = Math.max(...input.items.map((i) => i.foodItem.prepTimeMinutes));
    const order: Order = {
      id: newOrderId(),
      items: input.items,
      subtotal: totals.subtotal,
      deliveryFee: totals.deliveryFee,
      serviceFee: totals.serviceFee,
      packagingFee: totals.packagingFee,
      discount: totals.discount,
      total: totals.total,
      status: OrderStatus.placed,
      createdAt: new Date().toISOString(),
      deliveryAddress: input.deliveryAddress,
      paymentMethod: input.paymentMethod,
      riderName: null, riderPhone: null, riderVehicle: null, riderRating: null,
      estimatedDeliveryMinutes: prep + 15,
    };
    setOrders((list) => [order, ...list]);
    return order;
  }, [setOrders]);

  const advanceOrder = useCallback((id: string) => {
    setOrders((list) => list.map((o) => {
      const next = NEXT[o.status];
      if (o.id !== id || next === undefined) return o;
      if (next === OrderStatus.riderAssigned && !o.riderName) {
        const r = riders[Math.floor(Math.random() * riders.length)]!;
        return { ...o, status: next, riderName: r.name, riderPhone: r.phone, riderVehicle: r.vehicle, riderRating: r.rating };
      }
      return { ...o, status: next };
    }));
  }, [setOrders]);

  const cancelOrder = useCallback((id: string) => {
    const target = orders.find((o) => o.id === id);
    if (!target || target.status !== OrderStatus.placed) return false;
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, status: OrderStatus.cancelled } : o)));
    return true;
  }, [orders, setOrders]);

  const value = useMemo<OrdersContextValue>(() => ({
    orders,
    activeOrders: orders.filter((o) => isOrderActive(o.status)),
    pastOrders: orders.filter((o) => !isOrderActive(o.status)),
    getOrder: (id) => orders.find((o) => o.id === id),
    placeOrder, advanceOrder, cancelOrder,
  }), [orders, placeOrder, advanceOrder, cancelOrder]);

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used inside <OrdersProvider>');
  return ctx;
}
