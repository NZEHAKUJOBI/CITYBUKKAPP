import type { FoodCategory, FoodItem, Order, OrderStatus, Restaurant, UserProfile } from '../types';

export interface AdminIdentity {
  email: string;
  name: string;
}

export interface AdminSession {
  token: string;
  /** ISO-8601 timestamp */
  expiresAt: string;
  admin: AdminIdentity;
}

export interface AdminCategory extends FoodCategory {
  sortOrder?: number;
}

export type AdminRestaurant = Restaurant;

export interface AdminFoodItem extends FoodItem {
  isAvailable: boolean;
}

/**
 * Order as the admin API returns it. Rider/contact fields are declared here (not inherited) so the admin
 * panel keeps compiling while the shared customer `Order` type evolves.
 */
export interface AdminOrder extends Omit<Order, 'rider' | 'contactPhone' | 'riderName' | 'riderPhone' | 'riderVehicle' | 'riderRating' | 'promoCode' | 'updatedAt'> {
  /** Legacy flat rider fields (older servers). */
  riderName?: string | null;
  riderPhone?: string | null;
  riderVehicle?: string | null;
  promoCode?: string | null;
  updatedAt?: string;
  userId?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  /** Account that placed the order. */
  customer?: { id: string; name: string | null; phone: string | null } | null;
  /** Phone number the customer entered at checkout for this delivery. */
  contactPhone?: string | null;
  /** Rider assigned by an admin (null until assigned). */
  rider?: AdminOrderRider | null;
}

export interface AdminOrderRider {
  id: string;
  name: string;
  phone: string | null;
  vehicle?: string | null;
}

export interface AdminRider {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  vehicle: string;
  plateNumber?: string | null;
  isActive: boolean;
  activeOrders: number;
  deliveredOrders: number;
  createdAt?: string;
}

export interface RiderInput {
  name: string;
  phone: string;
  password: string;
  vehicle: string;
  plateNumber?: string;
  email?: string;
}

export type RiderPatch = Partial<Pick<AdminRider, 'name' | 'phone' | 'vehicle' | 'plateNumber' | 'isActive'>> & {
  password?: string;
  email?: string | null;
};

export type UserRole = 'customer' | 'rider' | 'admin';

export type OrderStatusKey = 'placed' | 'preparing' | 'riderAssigned' | 'outForDelivery' | 'delivered' | 'cancelled';

export interface AdminStats {
  ordersToday: number;
  revenueToday: number;
  activeOrders: number;
  totalOrders: number;
  restaurants: number;
  foodItems: number;
  categories: number;
  users: number;
  /** Rider accounts (added with rider support; older servers omit it). */
  riders?: number;
  ordersByStatus: Record<OrderStatusKey, number>;
  recentOrders: AdminOrder[];
}

export interface AdminUser extends Partial<UserProfile> {
  id: string;
  name: string;
  email: string;
  orderCount: number;
  role?: UserRole;
  createdAt?: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
}

export const STATUS_KEYS: OrderStatusKey[] = ['placed', 'preparing', 'riderAssigned', 'outForDelivery', 'delivered', 'cancelled'];

export const STATUS_LABELS: Record<OrderStatusKey, string> = {
  placed: 'Placed',
  preparing: 'Preparing',
  riderAssigned: 'Rider assigned',
  outForDelivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const statusKey = (status: OrderStatus | number): OrderStatusKey => STATUS_KEYS[status] ?? 'placed';
