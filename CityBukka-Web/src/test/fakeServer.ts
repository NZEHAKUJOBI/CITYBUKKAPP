// Test-only in-memory stand-in for CityBukka-Server, installed as global fetch.
import { clearCatalogCache } from '../data/api';
import { computeTotals } from '../lib/pricing';
import { resetMetaCache } from '../state/useMeta';
import type { CartItem, FoodCategory, FoodItem, Order, Restaurant, UserProfile } from '../types';
import { categories as fixtureCategories, foodItems as fixtureFoods, restaurants as fixtureRestaurants } from './fixtures';

export const TEST_TOKEN = 'test-token';

export const testUser = (over: Partial<UserProfile> = {}): UserProfile => ({
  id: 'user_1',
  name: 'Ada Customer',
  phone: '08031234567',
  email: 'ada@example.test',
  role: 'customer',
  avatarUrl: null,
  loyaltyPoints: 0,
  savedAddresses: ['12 Bosso Road, Minna'],
  selectedAddress: '12 Bosso Road, Minna',
  isDarkMode: true,
  createdAt: '2026-11-01T10:00:00.000Z',
  ...over,
});

export interface FakeServerOptions {
  /** Start with the fixture menu (default true). false = freshly installed, empty server. */
  withCatalog?: boolean;
  user?: UserProfile;
  password?: string;
  orders?: Order[];
}

export interface RecordedRequest {
  method: string;
  path: string;
  auth: string | null;
  body: unknown;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
const fail = (status: number, code: string, message = code) => json({ error: { code, message } }, status);

export function installFakeServer(options: FakeServerOptions = {}) {
  const withCatalog = options.withCatalog ?? true;
  const state = {
    categories: withCatalog ? structuredClone(fixtureCategories) as FoodCategory[] : [],
    restaurants: withCatalog ? structuredClone(fixtureRestaurants) as Restaurant[] : [],
    foods: withCatalog ? structuredClone(fixtureFoods) as FoodItem[] : [],
    user: options.user ?? testUser(),
    password: options.password ?? 'secret123',
    favorites: { food: [] as string[], restaurant: [] as string[] },
    orders: structuredClone(options.orders ?? []) as Order[],
    requests: [] as RecordedRequest[],
    /** Force the next response for a path (e.g. { 'POST /api/orders': fail(...) }). */
    overrides: new Map<string, () => Response>(),
  };

  const priceLines = (lines: { foodItemId: string; quantity: number; optionIds?: string[]; specialInstructions?: string }[]) =>
    lines.map((l, i): CartItem => {
      const food = state.foods.find((f) => f.id === l.foodItemId);
      if (!food) throw new Error(`unknown food ${l.foodItemId}`);
      const options = food.customizationGroups.flatMap((g) => g.options).filter((o) => l.optionIds?.includes(o.id));
      return { id: `line_${i}`, foodItem: food, quantity: l.quantity, selectedOptions: options, specialInstructions: l.specialInstructions ?? '' };
    });

  const handler = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    const auth = headers.get('Authorization');
    const body = init.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
    const path = url.pathname;
    state.requests.push({ method, path, auth, body });

    const override = state.overrides.get(`${method} ${path}`);
    if (override) {
      state.overrides.delete(`${method} ${path}`);
      return override();
    }

    const q = url.searchParams;
    let m: RegExpMatchArray | null;

    // ---- public catalogue ----
    if (method === 'GET' && path === '/api/categories') return json(state.categories);
    if (method === 'GET' && path === '/api/meta') {
      return json({
        currency: 'NGN',
        fees: { standardDeliveryFee: 650, serviceFee: 200, packagingFee: 150, freeDeliveryThreshold: 7500 },
        paymentMethods: ['CityPay Wallet', 'Debit / Credit Card', 'Bank Transfer', 'Cash on Delivery'],
      });
    }
    if (method === 'GET' && path === '/api/restaurants') {
      const term = q.get('q')?.toLowerCase();
      return json(state.restaurants.filter((r) => !term || r.name.toLowerCase().includes(term)));
    }
    if (method === 'GET' && (m = path.match(/^\/api\/restaurants\/([^/]+)$/))) {
      const r = state.restaurants.find((x) => x.id === decodeURIComponent(m![1]!));
      return r ? json(r) : fail(404, 'not_found');
    }
    if (method === 'GET' && path === '/api/food-items') {
      const term = q.get('q')?.toLowerCase();
      return json(state.foods.filter((f) =>
        (!q.get('categoryId') || f.categoryId === q.get('categoryId'))
        && (!q.get('restaurantId') || f.restaurantId === q.get('restaurantId'))
        && (!term || f.name.toLowerCase().includes(term))));
    }
    if (method === 'GET' && (m = path.match(/^\/api\/food-items\/([^/]+)$/))) {
      const f = state.foods.find((x) => x.id === decodeURIComponent(m![1]!));
      return f ? json(f) : fail(404, 'not_found');
    }

    // ---- auth ----
    if (method === 'POST' && path === '/api/auth/login') {
      if (body?.phone !== state.user.phone || body?.password !== state.password) return fail(401, 'invalid_credentials');
      return json({ token: TEST_TOKEN, expiresAt: '2099-01-01T00:00:00.000Z', user: state.user });
    }
    if (method === 'POST' && path === '/api/auth/register') {
      if (body?.phone === state.user.phone) return fail(409, 'phone_taken');
      state.user = testUser({ name: String(body?.name), phone: String(body?.phone), email: (body?.email as string) ?? null, savedAddresses: [], selectedAddress: null });
      state.password = String(body?.password);
      return json({ token: TEST_TOKEN, expiresAt: '2099-01-01T00:00:00.000Z', user: state.user }, 201);
    }

    // ---- everything else needs the customer token ----
    if (auth !== `Bearer ${TEST_TOKEN}`) return fail(401, 'unauthorized');

    if (method === 'GET' && path === '/api/auth/me') return json({ user: state.user });
    if (method === 'GET' && path === '/api/me') return json(state.user);
    if (method === 'PATCH' && path === '/api/me') {
      state.user = { ...state.user, ...(body as Partial<UserProfile>) };
      return json(state.user);
    }
    if (method === 'GET' && path === '/api/me/favorites/ids') {
      return json({ foodIds: state.favorites.food, restaurantIds: state.favorites.restaurant });
    }
    if (method === 'GET' && path === '/api/me/favorites') {
      return json({
        foodItems: state.foods.filter((f) => state.favorites.food.includes(f.id)),
        restaurants: state.restaurants.filter((r) => state.favorites.restaurant.includes(r.id)),
      });
    }
    if ((m = path.match(/^\/api\/me\/favorites\/(food|restaurant)\/([^/]+)$/))) {
      const list = state.favorites[m[1] as 'food' | 'restaurant'];
      const id = decodeURIComponent(m[2]!);
      if (method === 'PUT' && !list.includes(id)) list.push(id);
      if (method === 'DELETE') list.splice(list.indexOf(id) >>> 0, list.includes(id) ? 1 : 0);
      return new Response(null, { status: 204 });
    }
    if (method === 'POST' && path === '/api/cart/quote') {
      const items = priceLines(body?.items as never);
      return json({ items, ...computeTotals(items, (body?.promoCode as string) ?? null) });
    }
    if (method === 'GET' && path === '/api/orders') return json(state.orders);
    if (method === 'POST' && path === '/api/orders') {
      if (!body?.deliveryAddress || !body?.contactPhone) return fail(400, 'bad_request', 'Validation failed');
      const items = priceLines(body.items as never);
      const totals = computeTotals(items, (body.promoCode as string) ?? null);
      const order: Order = {
        id: `CB-${100000 + state.orders.length + 1}`,
        items,
        subtotal: totals.subtotal, deliveryFee: totals.deliveryFee, serviceFee: totals.serviceFee,
        packagingFee: totals.packagingFee, discount: totals.discount, total: totals.total,
        status: 0,
        createdAt: new Date().toISOString(),
        deliveryAddress: String(body.deliveryAddress),
        contactPhone: String(body.contactPhone),
        paymentMethod: String(body.paymentMethod),
        rider: null,
        estimatedDeliveryMinutes: 35,
      };
      state.orders.unshift(order);
      return json(order, 201);
    }
    if (method === 'GET' && (m = path.match(/^\/api\/orders\/([^/]+)$/))) {
      const o = state.orders.find((x) => x.id === decodeURIComponent(m![1]!));
      return o ? json(o) : fail(404, 'not_found', 'Order not found');
    }
    if (method === 'POST' && (m = path.match(/^\/api\/orders\/([^/]+)\/cancel$/))) {
      const o = state.orders.find((x) => x.id === decodeURIComponent(m![1]!));
      if (!o) return fail(404, 'not_found');
      if (o.status !== 0) return fail(409, 'conflict', 'The kitchen has started on this order, so it can no longer be cancelled');
      o.status = 5;
      return json(o);
    }

    return fail(404, 'not_found', `No route for ${method} ${path}`);
  };

  const fetchMock = vi.fn(handler);
  vi.stubGlobal('fetch', fetchMock);
  return { state, fetch: fetchMock };
}

/** Store a signed-in session (as if the customer had logged in earlier). */
export function signIn(user: UserProfile = testUser()) {
  localStorage.setItem('citybukka:session', JSON.stringify({ token: TEST_TOKEN, expiresAt: '2099-01-01T00:00:00.000Z', user }));
}

/** Reset module caches + storage between tests. */
export function resetClientState() {
  localStorage.clear();
  sessionStorage.clear();
  clearCatalogCache();
  resetMetaCache();
}

export { fixtureFoods as foodItems, fixtureRestaurants as restaurants, fixtureCategories as categories };
