import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { customerApi, toOrderLine } from '../data/customerApi';
import { isOrderActive } from '../lib/format';
import type { CartItem, Order } from '../types';
import { useAuth } from './AuthContext';

export interface PlaceOrderInput {
  items: CartItem[];
  promoCode: string | null;
  deliveryAddress: string;
  contactPhone: string;
  paymentMethod: string;
}

interface OrdersContextValue {
  orders: Order[];
  activeOrders: Order[];
  pastOrders: Order[];
  /** True until the first GET /api/orders answers. */
  loading: boolean;
  error: unknown;
  /** Cached order (from the list or a previous fetch). */
  getOrder(id: string): Order | undefined;
  /** GET /api/orders. */
  refresh(): Promise<void>;
  /** GET /api/orders/:id – updates the cache; resolves null on 404. */
  fetchOrder(id: string): Promise<Order | null>;
  /** POST /api/orders. Totals are always computed by the server. */
  placeOrder(input: PlaceOrderInput): Promise<Order>;
  /** POST /api/orders/:id/cancel. Rejects with the server's ApiError (e.g. kitchen already started). */
  cancelOrder(id: string): Promise<Order>;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

const newestFirst = (a: Order, b: Order) => b.createdAt.localeCompare(a.createdAt);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<unknown>(null);

  const upsert = useCallback((order: Order) => {
    setOrders((list) => [order, ...list.filter((o) => o.id !== order.id)].sort(newestFirst));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const list = await customerApi.listOrders();
      setOrders(list.sort(newestFirst));
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setOrders([]);
    setError(null);
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void refresh();
  }, [userId, refresh]);

  const fetchOrder = useCallback(async (id: string) => {
    try {
      const order = await customerApi.getOrder(id);
      upsert(order);
      return order;
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }, [upsert]);

  const placeOrder = useCallback(async (input: PlaceOrderInput) => {
    const order = await customerApi.placeOrder({
      items: input.items.map(toOrderLine),
      ...(input.promoCode ? { promoCode: input.promoCode } : {}),
      deliveryAddress: input.deliveryAddress,
      contactPhone: input.contactPhone,
      paymentMethod: input.paymentMethod,
    });
    upsert(order);
    return order;
  }, [upsert]);

  const cancelOrder = useCallback(async (id: string) => {
    const order = await customerApi.cancelOrder(id);
    upsert(order);
    return order;
  }, [upsert]);

  const value = useMemo<OrdersContextValue>(() => ({
    orders,
    activeOrders: orders.filter((o) => isOrderActive(o.status)),
    pastOrders: orders.filter((o) => !isOrderActive(o.status)),
    loading,
    error,
    getOrder: (id) => orders.find((o) => o.id === id),
    refresh, fetchOrder, placeOrder, cancelOrder,
  }), [orders, loading, error, refresh, fetchOrder, placeOrder, cancelOrder]);

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used inside <OrdersProvider>');
  return ctx;
}
