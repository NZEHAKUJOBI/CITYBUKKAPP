import { API_BASE_URL, resolveMediaUrl } from '../config/env';
import type { CartItem, FoodItem, Order, OrderRider, Restaurant, UserProfile } from '../types';
import { request } from './client';
import { cacheFoodItems, cacheRestaurants } from './api';
import { normalizeFood, normalizeRestaurant } from './httpCatalogApi';

// Endpoints for signed-in customers (Bearer token) plus the public auth/meta calls.

export interface AuthResponse {
  token: string;
  expiresAt: string | null;
  user: UserProfile;
}

export interface RegisterInput {
  name: string;
  phone: string;
  password: string;
  email?: string;
}

export type FavoriteKind = 'food' | 'restaurant';

export interface FavoriteIds {
  foodIds: string[];
  restaurantIds: string[];
}

export interface ProfileChanges {
  name?: string;
  /** '' or null clears it. */
  email?: string | null;
  savedAddresses?: string[];
  selectedAddress?: string;
  isDarkMode?: boolean;
}

export interface OrderLineInput {
  foodItemId: string;
  quantity: number;
  optionIds: string[];
  specialInstructions?: string;
}

export interface PlaceOrderBody {
  items: OrderLineInput[];
  promoCode?: string;
  deliveryAddress: string;
  contactPhone: string;
  paymentMethod: string;
}

export interface Quote {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  packagingFee: number;
  discount: number;
  total: number;
  promoCode?: string | null;
}

export interface Fees {
  standardDeliveryFee: number;
  serviceFee: number;
  packagingFee: number;
  freeDeliveryThreshold: number;
}

export interface Meta {
  currency: string;
  fees: Fees;
  paymentMethods: string[];
}

// ---- normalisers -----------------------------------------------------------

/** Fills optional fields so screens can rely on them. */
export function normalizeUser(u: Partial<UserProfile> & { id: string }): UserProfile {
  return {
    id: u.id,
    name: u.name ?? '',
    phone: u.phone ?? '',
    email: u.email ?? null,
    role: u.role ?? 'customer',
    avatarUrl: u.avatarUrl ? resolveMediaUrl(u.avatarUrl) : null,
    loyaltyPoints: typeof u.loyaltyPoints === 'number' ? u.loyaltyPoints : 0,
    savedAddresses: Array.isArray(u.savedAddresses) ? u.savedAddresses : [],
    selectedAddress: u.selectedAddress ?? null,
    isDarkMode: u.isDarkMode ?? true,
    createdAt: u.createdAt,
  };
}

type RawOrder = Omit<Order, 'rider' | 'contactPhone'> & {
  rider?: OrderRider | null;
  contactPhone?: string | null;
  // Older servers flattened the rider onto the order.
  riderName?: string | null;
  riderPhone?: string | null;
  riderVehicle?: string | null;
};

export function normalizeOrder(o: RawOrder): Order {
  const { riderName, riderPhone, riderVehicle, ...rest } = o;
  const rider = o.rider ?? (riderName ? { id: '', name: riderName, phone: riderPhone ?? null, vehicle: riderVehicle ?? null } : null);
  return {
    ...rest,
    items: (o.items ?? []).map((i: CartItem) => ({
      ...i,
      foodItem: normalizeFood(i.foodItem, API_BASE_URL),
      selectedOptions: i.selectedOptions ?? [],
      specialInstructions: i.specialInstructions ?? '',
    })),
    contactPhone: o.contactPhone ?? '',
    rider,
  };
}

/** Accepts both `{ user }` and a bare user object. */
const unwrapUser = (data: { user?: UserProfile } | UserProfile) =>
  normalizeUser(('user' in data && data.user ? data.user : data) as UserProfile);

const unwrapAuth = (data: AuthResponse): AuthResponse => ({ ...data, user: normalizeUser(data.user) });

// ---- calls -------------------------------------------------------------------

export const customerApi = {
  login: (phone: string, password: string) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: { phone, password }, auth: false }).then(unwrapAuth),

  register: (input: RegisterInput) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: input, auth: false }).then(unwrapAuth),

  authMe: () => request<{ user: UserProfile }>('/api/auth/me').then(unwrapUser),

  getMe: () => request<UserProfile | { user: UserProfile }>('/api/me').then(unwrapUser),

  updateMe: (changes: ProfileChanges) =>
    request<UserProfile | { user: UserProfile }>('/api/me', { method: 'PATCH', body: changes }).then(unwrapUser),

  getFavoriteIds: () => request<FavoriteIds>('/api/me/favorites/ids').then((ids) => ({
    foodIds: ids?.foodIds ?? [],
    restaurantIds: ids?.restaurantIds ?? [],
  })),

  /** Full favourite dishes and restaurants (for the Saved tab). */
  getFavorites: () => request<{ foodItems?: FoodItem[]; restaurants?: Restaurant[] }>('/api/me/favorites').then((d) => ({
    foodItems: (d?.foodItems ?? []).map((f) => normalizeFood(f, API_BASE_URL)),
    restaurants: (d?.restaurants ?? []).map((r) => normalizeRestaurant(r, API_BASE_URL)),
  })).then((favs) => {
    cacheFoodItems(favs.foodItems);
    cacheRestaurants(favs.restaurants);
    return favs;
  }),

  setFavorite: (kind: FavoriteKind, id: string, on: boolean) =>
    request<void>(`/api/me/favorites/${kind}/${encodeURIComponent(id)}`, { method: on ? 'PUT' : 'DELETE' }),

  listOrders: () => request<RawOrder[] | { items: RawOrder[] }>('/api/orders')
    .then((data) => (Array.isArray(data) ? data : data.items ?? []).map(normalizeOrder)),

  getOrder: (id: string) => request<RawOrder>(`/api/orders/${encodeURIComponent(id)}`).then(normalizeOrder),

  placeOrder: (body: PlaceOrderBody) => request<RawOrder>('/api/orders', { method: 'POST', body }).then(normalizeOrder),

  cancelOrder: (id: string) =>
    request<RawOrder>(`/api/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST' }).then(normalizeOrder),

  quote: (items: OrderLineInput[], promoCode?: string) =>
    request<Quote>('/api/cart/quote', { method: 'POST', body: { items, ...(promoCode ? { promoCode } : {}) } }),

  meta: () => request<Meta>('/api/meta', { auth: false }),
};

/** Cart line → the server's order line shape. */
export const toOrderLine = (item: CartItem): OrderLineInput => ({
  foodItemId: item.foodItem.id,
  quantity: item.quantity,
  optionIds: item.selectedOptions.map((o) => o.id),
  ...(item.specialInstructions ? { specialInstructions: item.specialInstructions } : {}),
});
