import type { CartItem } from '../types';

export interface RiderUser {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: string;
}

export interface RiderSession {
  token: string;
  /** ISO-8601 timestamp */
  expiresAt: string;
  user: RiderUser;
}

export interface RiderProfile {
  vehicle: string;
  plateNumber?: string | null;
  isActive: boolean;
}

export interface RiderMe {
  user: RiderUser;
  rider: RiderProfile;
}

/** Order as GET /api/rider/orders returns it (existing order shape + customer contact). */
export interface RiderOrder {
  id: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  packagingFee: number;
  discount: number;
  total: number;
  status: number;
  createdAt: string;
  updatedAt?: string;
  deliveryAddress: string;
  /** Number the customer entered at checkout for this delivery. */
  contactPhone?: string | null;
  paymentMethod: string;
  customer: { name: string | null; phone: string | null } | null;
  estimatedDeliveryMinutes?: number;
}

export type DeliveryScope = 'active' | 'completed';

export const RIDER_ASSIGNED = 2;
export const OUT_FOR_DELIVERY = 3;
export const DELIVERED = 4;
export const CANCELLED = 5;

export const RIDER_STATUS_LABELS: Record<number, string> = {
  0: 'Placed',
  1: 'Preparing',
  [RIDER_ASSIGNED]: 'Ready for pickup',
  [OUT_FOR_DELIVERY]: 'Out for delivery',
  [DELIVERED]: 'Delivered',
  [CANCELLED]: 'Cancelled',
};

export const isCashOnDelivery = (paymentMethod: string | null | undefined) =>
  !!paymentMethod && /cash/i.test(paymentMethod);

export const itemCount = (o: Pick<RiderOrder, 'items'>) => o.items.reduce((n, i) => n + i.quantity, 0);

export const mapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
