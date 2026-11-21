import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { normalizePhone } from '../src/lib/auth.js';
import { bearer, client, createCatalog, setupTestDb, startServer, TEST_CONFIG, uniquePhone } from './helpers.js';

const db = await setupTestDb('api');

const admin = bearer(TEST_CONFIG.adminApiKey);
const jollof = { foodItemId: 'food_jellof_rice', quantity: 1, optionIds: ['p_chk'] };
let base;
let server;
const call = client(() => base);

/** Register a customer; returns `{ token, user, headers, password }`. */
async function register(overrides = {}) {
  const body = { name: 'Tunde Adeleke', phone: uniquePhone(), password: 'secret123', ...overrides };
  const res = await call('POST', '/api/auth/register', body);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { ...res.body, headers: bearer(res.body.token), password: body.password };
}

async function createRider(overrides = {}) {
  const body = { name: 'Femi Balogun', phone: uniquePhone(), password: 'rider-pass', vehicle: 'Bajaj Boxer', ...overrides };
  const res = await call('POST', '/api/admin/riders', body, admin);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const login = await call('POST', '/api/auth/login', { phone: body.phone, password: body.password });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  return { rider: res.body, headers: bearer(login.body.token), login: login.body };
}

test('phone normalisation (unit)', () => {
  assert.equal(normalizePhone('08031234567'), '+2348031234567');
  assert.equal(normalizePhone('0803 123 4567'), '+2348031234567');
  assert.equal(normalizePhone('2348031234567'), '+2348031234567');
  assert.equal(normalizePhone('+234 803-123-4567'), '+2348031234567');
  assert.equal(normalizePhone('07011112222'), '+2347011112222');
  for (const bad of ['', '12345', '0803123456', '080312345678', '+4479111222333', '03031234567', 'abc']) {
    assert.equal(normalizePhone(bad), null, bad);
  }
});

describe('customer + rider API (PostgreSQL)', { skip: db.skip }, () => {
  before(async () => {
    ({ base, server } = await startServer(db.pool));
  });
  after(async () => {
    server?.close();
    await db.pool?.end();
  });

  describe('empty seed', () => {
    test('no restaurants or dishes; only the built-in "All" category', async () => {
      assert.deepEqual((await call('GET', '/api/restaurants')).body, []);
      assert.deepEqual((await call('GET', '/api/food-items')).body, []);
      const cats = (await call('GET', '/api/categories')).body;
      assert.deepEqual(cats.map((c) => c.id), ['cat_all']);
      assert.equal(cats[0].name, 'All');
      assert.equal(cats[0].iconEmoji, '🍽️');
      const stats = (await call('GET', '/api/admin/stats', undefined, admin)).body;
      assert.equal(stats.users, 0);
      assert.equal(stats.riders, 0);
      assert.equal(stats.totalOrders, 0);
      assert.deepEqual((await call('GET', '/api/admin/users', undefined, admin)).body, []);
    });

    test('meta is public', async () => {
      const meta = await call('GET', '/api/meta');
      assert.equal(meta.status, 200);
      assert.equal(meta.body.currency, 'NGN');
    });
  });

  describe('catalogue', () => {
    before(() => createCatalog(call, admin));

    test('lists categories, restaurants and food items', async () => {
      assert.deepEqual((await call('GET', '/api/categories')).body.map((c) => c.id), ['cat_all', 'cat_rice', 'cat_drinks']);
      assert.equal((await call('GET', '/api/restaurants')).body.length, 3);
      const suya = await call('GET', '/api/restaurants?q=SUYA');
      assert.deepEqual(suya.body.map((r) => r.id), ['rest_kano_suya']);
      const byCuisine = await call('GET', '/api/restaurants?cuisine=Jollof');
      assert.deepEqual(byCuisine.body.map((r) => r.id), ['rest_mama_ope']);
      const drinks = await call('GET', '/api/food-items?categoryId=cat_drinks');
      assert.equal(drinks.body.length, 2);
      assert.equal('isAvailable' in drinks.body[0], false);
      assert.equal(typeof drinks.body[0].price, 'number');
      assert.equal(drinks.body[0].imageUrl, '');
      assert.equal((await call('GET', '/api/food-items?categoryId=cat_all')).body.length, 4);
      assert.equal((await call('GET', '/api/restaurants/rest_mama_ope/menu')).body.length, 2);
      assert.equal((await call('GET', '/api/restaurants/rest_mama_ope')).body.deliveryFee, 650);
    });

    test('food search is case-insensitive', async () => {
      const res = await call('GET', '/api/food-items?q=JELLOF');
      assert.deepEqual(res.body.map((f) => f.id), ['food_jellof_rice']);
    });

    test('404 for unknown ids', async () => {
      assert.equal((await call('GET', '/api/restaurants/nope')).status, 404);
      assert.equal((await call('GET', '/api/food-items/nope')).status, 404);
    });
  });

  describe('auth', () => {
    test('register → token + user; login with any phone format; /auth/me', async () => {
      const reg = await call('POST', '/api/auth/register', {
        name: 'Ada Obi', phone: '0805 111 2233', password: 'hunter22', email: 'Ada@Example.com',
      });
      assert.equal(reg.status, 201, JSON.stringify(reg.body));
      assert.match(reg.body.token, /^[\w-]+\.[\w-]+$/);
      const ttl = Date.parse(reg.body.expiresAt) - Date.now();
      assert.ok(ttl > 29.9 * 86400e3 && ttl <= 30 * 86400e3);
      const u = reg.body.user;
      assert.deepEqual(Object.keys(u).sort(), ['avatarUrl', 'createdAt', 'email', 'id', 'isDarkMode', 'loyaltyPoints',
        'name', 'phone', 'role', 'savedAddresses', 'selectedAddress'].sort());
      assert.equal(u.phone, '+2348051112233');
      assert.equal(u.role, 'customer');
      assert.equal(u.email, 'ada@example.com');
      assert.deepEqual(u.savedAddresses, []);
      assert.equal(u.loyaltyPoints, 0);

      for (const phone of ['08051112233', '2348051112233', '+2348051112233']) {
        const login = await call('POST', '/api/auth/login', { phone, password: 'hunter22' });
        assert.equal(login.status, 200, phone);
        assert.equal(login.body.user.id, u.id);
      }
      const me = await call('GET', '/api/auth/me', undefined, bearer(reg.body.token));
      assert.deepEqual(me.body, { user: u });
    });

    test('register errors: phone_taken, invalid_phone, short password', async () => {
      const { user } = await register();
      const dup = await call('POST', '/api/auth/register', { name: 'X', phone: user.phone, password: 'secret123' });
      assert.equal(dup.status, 409);
      assert.equal(dup.body.error.code, 'phone_taken');
      const bad = await call('POST', '/api/auth/register', { name: 'X', phone: '12345', password: 'secret123' });
      assert.equal(bad.status, 400);
      assert.equal(bad.body.error.code, 'invalid_phone');
      assert.equal((await call('POST', '/api/auth/register', { name: 'X', phone: uniquePhone(), password: '12345' })).status, 400);
      const noEmail = await register({ email: undefined });
      assert.equal(noEmail.user.email, null);
    });

    test('login errors: invalid_credentials, account_disabled', async () => {
      const { user } = await register();
      const wrong = await call('POST', '/api/auth/login', { phone: user.phone, password: 'nope-nope' });
      assert.equal(wrong.status, 401);
      assert.equal(wrong.body.error.code, 'invalid_credentials');
      const unknown = await call('POST', '/api/auth/login', { phone: uniquePhone(), password: 'secret123' });
      assert.equal(unknown.body.error.code, 'invalid_credentials');

      const { rider } = await createRider({ password: 'pw-disabled' });
      await call('PATCH', `/api/admin/riders/${rider.id}`, { isActive: false }, admin);
      const disabled = await call('POST', '/api/auth/login', { phone: rider.phone, password: 'pw-disabled' });
      assert.equal(disabled.status, 403);
      assert.equal(disabled.body.error.code, 'account_disabled');
    });

    test('auth endpoints are rate limited per IP', async () => {
      const { createRateLimiter } = await import('../src/lib/adminAuth.js');
      const limited = await startServer(db.pool, {}, { authLimiter: createRateLimiter({ max: 2, windowMs: 60_000 }) });
      const c = client(() => limited.base);
      try {
        const attempt = () => c('POST', '/api/auth/login', { phone: '08030000000', password: 'whatever' });
        assert.equal((await attempt()).status, 401);
        assert.equal((await attempt()).status, 401);
        const res = await attempt();
        assert.equal(res.status, 429);
        assert.equal(res.body.error.code, 'rate_limited');
        assert.ok(Number(res.headers.get('retry-after')) > 0);
      } finally {
        limited.server.close();
      }
    });
  });

  describe('role enforcement', () => {
    let customer;
    let riderA;
    let riderB;
    before(async () => {
      customer = await register();
      riderA = await createRider({ name: 'Rider A' });
      riderB = await createRider({ name: 'Rider B' });
    });

    test('customer routes need a customer token', async () => {
      for (const [method, path] of [['GET', '/api/me'], ['GET', '/api/orders'], ['POST', '/api/cart/quote'], ['GET', '/api/me/favorites/ids']]) {
        const none = await call(method, path, method === 'POST' ? { items: [jollof] } : undefined);
        assert.equal(none.status, 401, path);
        assert.equal(none.body.error.code, 'unauthorized');
        const asRider = await call(method, path, method === 'POST' ? { items: [jollof] } : undefined, riderA.headers);
        assert.equal(asRider.status, 403, path);
        assert.equal(asRider.body.error.code, 'forbidden');
      }
      assert.equal((await call('GET', '/api/me', undefined, bearer('garbage'))).status, 401);
      assert.equal((await call('GET', '/api/me', undefined, admin)).status, 401, 'admin key is not a customer token');
    });

    test('customers cannot use rider or admin routes', async () => {
      const r = await call('GET', '/api/rider/orders', undefined, customer.headers);
      assert.equal(r.status, 403);
      assert.equal(r.body.error.code, 'forbidden');
      assert.equal((await call('GET', '/api/rider/me', undefined)).status, 401);
      assert.equal((await call('GET', '/api/admin/stats', undefined, customer.headers)).status, 401);
      assert.equal((await call('GET', '/api/admin/stats', undefined, riderA.headers)).status, 401);
    });

    test('a token signed with another secret is rejected', async () => {
      const { issueUserToken } = await import('../src/lib/auth.js');
      const forged = issueUserToken('other-secret', { id: customer.user.id, role: 'customer' }).token;
      assert.equal((await call('GET', '/api/me', undefined, bearer(forged))).status, 401);
    });

    test('a rider cannot see or move another rider\'s order', async () => {
      const placed = await call('POST', '/api/orders', { items: [jollof], deliveryAddress: 'GRA, Minna', paymentMethod: 'Cash on Delivery' }, customer.headers);
      const id = placed.body.id;
      await call('POST', `/api/admin/orders/${id}/advance`, undefined, admin);
      assert.equal((await call('POST', `/api/admin/orders/${id}/assign`, { riderId: riderA.rider.id }, admin)).status, 200);

      assert.equal((await call('GET', `/api/rider/orders/${id}`, undefined, riderB.headers)).status, 404);
      assert.equal((await call('POST', `/api/rider/orders/${id}/pickup`, undefined, riderB.headers)).status, 404);
      assert.ok(!(await call('GET', '/api/rider/orders', undefined, riderB.headers)).body.some((o) => o.id === id));
      assert.equal((await call('GET', `/api/rider/orders/${id}`, undefined, riderA.headers)).status, 200);
    });
  });

  describe('orders', () => {
    let customer;
    before(async () => {
      customer = await register({ name: 'Order Tester' });
    });
    const place = (body, headers = customer.headers) => call('POST', '/api/orders', {
      items: [jollof], deliveryAddress: 'Shiroro Road by Unity Block, Minna', paymentMethod: 'Cash on Delivery', ...body,
    }, headers);

    test('quote validates promo codes', async () => {
      const ok = await call('POST', '/api/cart/quote', { items: [jollof], promoCode: 'bukka20' }, customer.headers);
      assert.equal(ok.status, 200);
      assert.equal(ok.body.discount, 700);
      assert.equal(ok.body.promoCode, 'BUKKA20');
      const bad = await call('POST', '/api/cart/quote', { items: [jollof], promoCode: 'FREE' }, customer.headers);
      assert.equal(bad.status, 400);
    });

    test('ignores client-sent prices; contactPhone defaults to the account phone', async () => {
      const res = await place({ items: [{ ...jollof, price: 1 }], total: 1 });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      assert.equal(res.body.total, 3500 + 650 + 200 + 150);
      assert.equal(typeof res.body.subtotal, 'number');
      assert.match(res.body.id, /^CB-\d{6}$/);
      assert.equal(res.body.contactPhone, customer.user.phone);
      assert.equal(res.body.deliveryAddress, 'Shiroro Road by Unity Block, Minna');
      assert.equal(res.body.rider, null);
      assert.equal(res.body.estimatedDeliveryMinutes, 20 + 25);
    });

    test('explicit contactPhone is normalised; invalid → invalid_phone; deliveryAddress required', async () => {
      const res = await place({ contactPhone: '0809 999 8888' });
      assert.equal(res.body.contactPhone, '+2348099998888');
      const bad = await place({ contactPhone: '999' });
      assert.equal(bad.status, 400);
      assert.equal(bad.body.error.code, 'invalid_phone');
      const noAddr = await call('POST', '/api/orders', { items: [jollof], paymentMethod: 'Cash on Delivery' }, customer.headers);
      assert.equal(noAddr.status, 400);
    });

    test('customers only see their own orders', async () => {
      const mine = (await place()).body.id;
      const other = await register();
      assert.equal((await call('GET', `/api/orders/${mine}`, undefined, other.headers)).status, 404);
      assert.ok(!(await call('GET', '/api/orders', undefined, other.headers)).body.some((o) => o.id === mine));
      assert.equal((await call('POST', `/api/orders/${mine}/cancel`, undefined, other.headers)).status, 404);
    });

    test('customer can cancel only before the kitchen starts', async () => {
      const a = (await place()).body.id;
      assert.equal((await call('POST', `/api/orders/${a}/cancel`, undefined, customer.headers)).body.status, 5);
      const b = (await place()).body.id;
      await call('POST', `/api/admin/orders/${b}/advance`, undefined, admin);
      assert.equal((await call('POST', `/api/orders/${b}/cancel`, undefined, customer.headers)).status, 409);
    });

    test('rejects bad payloads and payment methods', async () => {
      const res = await call('POST', '/api/orders', { items: [], deliveryAddress: 'x', paymentMethod: 'Crypto' }, customer.headers);
      assert.equal(res.status, 400);
      assert.ok(res.body.error.details.length >= 2);
    });

    test('full lifecycle: place → preparing → assign → pickup → deliver', async () => {
      const { rider, headers: riderHeaders } = await createRider({ name: 'Chidi Okonkwo', vehicle: 'TVS Neo', plateNumber: 'MNA-904-AA' });
      const placed = await place({ contactPhone: '+2348077776666', deliveryAddress: '12 Government Road, GRA, Minna', paymentMethod: 'Bank Transfer' });
      const id = placed.body.id;
      assert.equal(placed.body.status, 0);

      // placed → preparing; preparing can't advance without a rider
      assert.equal((await call('POST', `/api/admin/orders/${id}/advance`, undefined, admin)).body.status, 1);
      const noRider = await call('POST', `/api/admin/orders/${id}/advance`, undefined, admin);
      assert.equal(noRider.status, 409);
      assert.equal(noRider.body.error.code, 'rider_required');

      // rider sees nothing yet
      assert.deepEqual((await call('GET', '/api/rider/orders', undefined, riderHeaders)).body, []);

      const assigned = await call('POST', `/api/admin/orders/${id}/assign`, { riderId: rider.id }, admin);
      assert.equal(assigned.status, 200, JSON.stringify(assigned.body));
      assert.equal(assigned.body.status, 2);
      assert.deepEqual(assigned.body.rider, { id: rider.id, name: 'Chidi Okonkwo', phone: rider.phone, vehicle: 'TVS Neo' });
      assert.deepEqual(assigned.body.customer, { id: customer.user.id, name: 'Order Tester', phone: customer.user.phone });
      assert.equal(assigned.body.contactPhone, '+2348077776666');

      // rider sees the order with customer phone + address
      const active = (await call('GET', '/api/rider/orders', undefined, riderHeaders)).body;
      assert.deepEqual(active.map((o) => o.id), [id]);
      const view = (await call('GET', `/api/rider/orders/${id}`, undefined, riderHeaders)).body;
      assert.deepEqual(view.customer, { name: 'Order Tester', phone: customer.user.phone });
      assert.equal(view.contactPhone, '+2348077776666');
      assert.equal(view.deliveryAddress, '12 Government Road, GRA, Minna');
      assert.equal(view.paymentMethod, 'Bank Transfer');
      assert.equal(view.items.length, 1);
      assert.equal(view.total, placed.body.total);

      // wrong-order transitions
      const early = await call('POST', `/api/rider/orders/${id}/deliver`, undefined, riderHeaders);
      assert.equal(early.status, 409);
      assert.equal(early.body.error.code, 'invalid_status');

      const picked = await call('POST', `/api/rider/orders/${id}/pickup`, undefined, riderHeaders);
      assert.equal(picked.status, 200);
      assert.equal(picked.body.status, 3);
      assert.equal((await call('POST', `/api/rider/orders/${id}/pickup`, undefined, riderHeaders)).body.error.code, 'invalid_status');
      // can't reassign once on the road
      assert.equal((await call('POST', `/api/admin/orders/${id}/assign`, { riderId: rider.id }, admin)).body.error.code, 'invalid_status');

      const delivered = await call('POST', `/api/rider/orders/${id}/deliver`, undefined, riderHeaders);
      assert.equal(delivered.body.status, 4);
      assert.deepEqual((await call('GET', '/api/rider/orders?scope=active', undefined, riderHeaders)).body, []);
      const completed = (await call('GET', '/api/rider/orders?scope=completed', undefined, riderHeaders)).body;
      assert.deepEqual(completed.map((o) => o.id), [id]);

      // customer sees delivered + rider info
      const mine = (await call('GET', `/api/orders/${id}`, undefined, customer.headers)).body;
      assert.equal(mine.status, 4);
      assert.deepEqual(mine.rider, { id: rider.id, name: 'Chidi Okonkwo', phone: rider.phone, vehicle: 'TVS Neo' });
      assert.equal(mine.riderName, 'Chidi Okonkwo');
      assert.equal('customer' in mine, false);
      const past = (await call('GET', '/api/orders?status=past', undefined, customer.headers)).body;
      assert.ok(past.some((o) => o.id === id));

      // rider stats
      const listed = (await call('GET', '/api/admin/riders', undefined, admin)).body.find((r) => r.id === rider.id);
      assert.equal(listed.deliveredOrders, 1);
      assert.equal(listed.activeOrders, 0);
      assert.equal(listed.plateNumber, 'MNA-904-AA');
    });

    test('rider /me', async () => {
      const { rider, headers } = await createRider({ vehicle: 'Bike', plateNumber: 'ABC-123' });
      const me = await call('GET', '/api/rider/me', undefined, headers);
      assert.equal(me.status, 200);
      assert.equal(me.body.user.id, rider.id);
      assert.equal(me.body.user.role, 'rider');
      assert.deepEqual(me.body.rider, { vehicle: 'Bike', plateNumber: 'ABC-123', isActive: true });
    });
  });

  describe('profile & favourites', () => {
    let customer;
    before(async () => {
      customer = await register();
    });

    test('updates profile with validation; phone is not editable', async () => {
      const h = customer.headers;
      const ok = await call('PATCH', '/api/me', { name: 'Tunde A.', isDarkMode: false, savedAddresses: ['GRA, Minna'], selectedAddress: 'GRA, Minna' }, h);
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      assert.equal(ok.body.name, 'Tunde A.');
      assert.equal(ok.body.isDarkMode, false);
      assert.deepEqual(ok.body.savedAddresses, ['GRA, Minna']);
      assert.equal((await call('PATCH', '/api/me', { loyaltyPoints: 99999 }, h)).status, 400);
      assert.equal((await call('PATCH', '/api/me', { phone: '08030000001' }, h)).status, 400);
      assert.equal((await call('PATCH', '/api/me', { role: 'admin' }, h)).status, 400);
      assert.equal((await call('PATCH', '/api/me', { selectedAddress: 'Somewhere new' }, h)).status, 400);
      assert.equal((await call('GET', '/api/me', undefined, h)).body.name, 'Tunde A.');
    });

    test('add and remove favourites idempotently', async () => {
      const h = customer.headers;
      assert.equal((await call('PUT', '/api/me/favorites/foods/food_zobo', undefined, h)).status, 204);
      assert.equal((await call('PUT', '/api/me/favorites/foods/food_zobo', undefined, h)).status, 204);
      assert.equal((await call('PUT', '/api/me/favorites/restaurants/rest_mama_ope', undefined, h)).status, 204);
      let ids = (await call('GET', '/api/me/favorites/ids', undefined, h)).body;
      assert.deepEqual(ids, { foodIds: ['food_zobo'], restaurantIds: ['rest_mama_ope'] });
      const full = (await call('GET', '/api/me/favorites', undefined, h)).body;
      assert.deepEqual(full.foodItems.map((f) => f.id), ['food_zobo']);
      assert.deepEqual(full.restaurants.map((r) => r.id), ['rest_mama_ope']);
      await call('DELETE', '/api/me/favorites/foods/food_zobo', undefined, h);
      ids = (await call('GET', '/api/me/favorites/ids', undefined, h)).body;
      assert.ok(!ids.foodIds.includes('food_zobo'));
      assert.equal((await call('PUT', '/api/me/favorites/foods/nope', undefined, h)).status, 404);
    });
  });
});
