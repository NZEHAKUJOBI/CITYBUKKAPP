import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { createRateLimiter, issueToken, verifyToken } from '../src/lib/adminAuth.js';
import { issueUserToken } from '../src/lib/auth.js';
import { bearer, createCatalog, setupTestDb, startServer, TEST_CONFIG, uniquePhone } from './helpers.js';

const db = await setupTestDb('admin');

const ADMIN_KEY = TEST_CONFIG.adminApiKey;
const EMAIL = TEST_CONFIG.adminEmail;
const PASSWORD = TEST_CONFIG.adminPassword;
const SECRET = TEST_CONFIG.adminTokenSecret;

const uploadDir = mkdtempSync(join(tmpdir(), 'citybukka-uploads-'));
const servers = [];

async function start(configOverrides = {}, opts = {}) {
  const { base: root, server } = await startServer(db.pool, { uploadDir, ...configOverrides }, opts);
  servers.push(server);
  return root;
}

let base;
let auth;

async function call(method, path, body, headers = auth, root = base) {
  const res = await fetch(root + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
}

async function upload(bytes, { type = 'image/png', filename = 'pic.png', field = 'image', headers = auth } = {}) {
  const form = new FormData();
  form.append(field, new Blob([bytes], { type }), filename);
  const res = await fetch(`${base}/api/admin/uploads`, { method: 'POST', headers, body: form });
  return { status: res.status, body: await res.json() };
}

const newRider = async (name = 'Rider', extra = {}) =>
  (await call('POST', '/api/admin/riders', { name, phone: uniquePhone(), password: 'rider-pass', vehicle: 'Bike', ...extra })).body;

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 2)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 '), Buffer.alloc(32)]);

describe('admin API (PostgreSQL)', { skip: db.skip }, () => {
  before(async () => {
    base = await start();
    const login = await call('POST', '/api/admin/login', { email: EMAIL, password: PASSWORD }, {});
    auth = { authorization: `Bearer ${login.body.token}` };
    await createCatalog((m, p, b, h) => call(m, p, b, h), auth);
  });

  after(async () => {
    servers.forEach((s) => s.close());
    rmSync(uploadDir, { recursive: true, force: true });
    await db.pool?.end();
  });

  describe('admin auth', () => {
    test('login returns a token, expiry and admin profile', async () => {
      const res = await call('POST', '/api/admin/login', { email: EMAIL.toUpperCase(), password: PASSWORD }, {});
      assert.equal(res.status, 200);
      assert.match(res.body.token, /^[\w-]+\.[\w-]+$/);
      const ttl = Date.parse(res.body.expiresAt) - Date.now();
      assert.ok(ttl > 11.9 * 3600e3 && ttl <= 12 * 3600e3);
      assert.deepEqual(res.body.admin, { email: EMAIL, name: 'Boss' });
    });

    test('bad credentials → 401', async () => {
      const wrong = await call('POST', '/api/admin/login', { email: EMAIL, password: 'nope' }, {});
      assert.equal(wrong.status, 401);
      assert.equal(wrong.body.error.code, 'invalid_credentials');
      assert.equal((await call('POST', '/api/admin/login', { email: 'x@y.z', password: PASSWORD }, {})).status, 401);
      assert.equal((await call('POST', '/api/admin/login', {}, {})).status, 400);
    });

    test('GET /me works with a token and with the legacy API key', async () => {
      assert.deepEqual((await call('GET', '/api/admin/me')).body, { email: EMAIL, name: 'Boss' });
      const legacy = await call('GET', '/api/admin/me', undefined, { authorization: `Bearer ${ADMIN_KEY}` });
      assert.equal(legacy.status, 200);
    });

    test('rejects missing, forged, tampered and expired tokens', async () => {
      const tryToken = async (token) =>
        (await call('GET', '/api/admin/stats', undefined, token === undefined ? {} : { authorization: `Bearer ${token}` })).status;
      assert.equal(await tryToken(undefined), 401);
      assert.equal(await tryToken('garbage'), 401);
      assert.equal(await tryToken(issueToken('other-secret', { email: EMAIL, name: 'x' }).token), 401);
      const [payload, sig] = auth.authorization.slice(7).split('.');
      const forged = Buffer.from(JSON.stringify({ sub: EMAIL, exp: Date.now() + 1e12 })).toString('base64url');
      assert.equal(await tryToken(`${forged}.${sig}`), 401);
      assert.equal(await tryToken(`${payload}.${sig}x`), 401);
      const expired = issueToken(SECRET, { email: EMAIL, name: 'x' }, Date.now() - 13 * 3600e3).token;
      assert.equal(await tryToken(expired), 401);
      assert.equal(verifyToken(SECRET, expired), null);
    });

    test('customer and rider tokens are never admin tokens', async () => {
      const userToken = issueUserToken(SECRET, { id: 'x', role: 'customer' }).token;
      assert.equal((await call('GET', '/api/admin/me', undefined, bearer(userToken))).status, 401);
      assert.equal(verifyToken(SECRET, userToken), null);
    });

    test('login is rate limited per IP', async () => {
      const root = await start({}, { loginLimiter: createRateLimiter({ max: 2, windowMs: 60_000 }) });
      const attempt = () => call('POST', '/api/admin/login', { email: EMAIL, password: 'bad' }, {}, root);
      assert.equal((await attempt()).status, 401);
      assert.equal((await attempt()).status, 401);
      const limited = await attempt();
      assert.equal(limited.status, 429);
      assert.equal(limited.body.error.code, 'rate_limited');
      assert.ok(Number(limited.headers.get('retry-after')) > 0);
    });

    test('login is disabled when credentials are not configured', async () => {
      const root = await start({ adminEmail: '', adminPassword: '' });
      const res = await call('POST', '/api/admin/login', { email: EMAIL, password: PASSWORD }, {}, root);
      assert.equal(res.status, 503);
    });

    test('CORS preflight allows Authorization from the Vite dev origin', async () => {
      const res = await fetch(`${base}/api/admin/restaurants`, {
        method: 'OPTIONS',
        headers: {
          origin: 'http://localhost:5173',
          'access-control-request-method': 'PATCH',
          'access-control-request-headers': 'authorization,content-type',
        },
      });
      assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
      assert.match(res.headers.get('access-control-allow-headers'), /authorization/i);
    });
  });

  describe('admin restaurants', () => {
    test('CRUD round trip', async () => {
      const created = await call('POST', '/api/admin/restaurants', {
        name: 'Test Bukka',
        address: '1 Test Road, Minna',
        coverImageUrl: '/uploads/abc123.jpg',
        logoUrl: 'https://example.com/logo.png',
        cuisines: ['Test'],
        isOpen: false,
      });
      assert.equal(created.status, 201);
      assert.match(created.body.id, /^rest_[0-9a-f]+$/);
      assert.equal(created.body.isOpen, false);
      assert.equal(created.body.isFeatured, false);
      assert.deepEqual(created.body.badges, []);
      assert.equal(created.body.deliveryFee, 650);
      const id = created.body.id;

      const list = await call('GET', '/api/admin/restaurants');
      assert.ok(list.body.some((r) => r.id === id), 'closed restaurants are listed for admins');

      const patched = await call('PATCH', `/api/admin/restaurants/${id}`, { tagline: 'Now open', isOpen: true, id: 'ignored', deliveryFee: 499.5 });
      assert.equal(patched.status, 200);
      assert.equal(patched.body.id, id);
      assert.equal(patched.body.tagline, 'Now open');
      assert.equal(patched.body.name, 'Test Bukka');
      assert.equal(patched.body.deliveryFee, 499.5);
      assert.equal((await call('GET', `/api/admin/restaurants/${id}`)).body.isOpen, true);

      assert.equal((await call('DELETE', `/api/admin/restaurants/${id}`)).status, 204);
      assert.equal((await call('GET', `/api/admin/restaurants/${id}`)).status, 404);
      assert.equal((await call('DELETE', `/api/admin/restaurants/${id}`)).status, 404);
    });

    test('validation: image URLs, explicit ids, delivery times', async () => {
      const bad = await call('POST', '/api/admin/restaurants', { name: 'X', logoUrl: 'http://insecure.example/x.png' });
      assert.equal(bad.status, 400);
      assert.equal(bad.body.error.details[0].path, 'logoUrl');
      assert.equal((await call('POST', '/api/admin/restaurants', { name: 'X', coverImageUrl: '/etc/passwd' })).status, 400);
      assert.equal((await call('POST', '/api/admin/restaurants', { tagline: 'no name' })).status, 400);
      assert.equal((await call('PATCH', '/api/admin/restaurants/rest_mama_ope', { deliveryTimeMax: 1 })).status, 400);

      const named = await call('POST', '/api/admin/restaurants', { id: 'rest_custom', name: 'Custom' });
      assert.equal(named.body.id, 'rest_custom');
      assert.equal((await call('POST', '/api/admin/restaurants', { id: 'rest_custom', name: 'Again' })).status, 409);
    });

    test('cannot delete a restaurant that still has food items', async () => {
      const res = await call('DELETE', '/api/admin/restaurants/rest_mama_ope');
      assert.equal(res.status, 409);
      assert.equal(res.body.error.code, 'in_use');
    });
  });

  describe('admin categories', () => {
    test('CRUD round trip', async () => {
      const created = await call('POST', '/api/admin/categories', { name: 'Soups', iconEmoji: '🍲' });
      assert.equal(created.status, 201);
      assert.match(created.body.id, /^cat_[0-9a-f]+$/);
      assert.deepEqual(Object.keys(created.body).sort(), ['description', 'iconEmoji', 'id', 'name', 'sortOrder']);
      assert.equal(typeof created.body.sortOrder, 'number');
      const id = created.body.id;

      const all = (await call('GET', '/api/admin/categories')).body;
      assert.equal(all[0].id, 'cat_all', 'the built-in "All" category is always first');
      assert.equal(all.at(-1).id, id, 'new categories are appended');

      const patched = await call('PATCH', `/api/admin/categories/${id}`, { description: 'Hot pots' });
      assert.equal(patched.body.description, 'Hot pots');
      assert.equal(patched.body.name, 'Soups');
      assert.equal((await call('PATCH', '/api/admin/categories/nope', { name: 'x' })).status, 404);

      assert.equal((await call('DELETE', `/api/admin/categories/${id}`)).status, 204);
      assert.ok(!(await call('GET', '/api/categories')).body.some((c) => c.id === id));
    });

    test('cannot delete a category in use, or the built-in cat_all', async () => {
      const res = await call('DELETE', '/api/admin/categories/cat_rice');
      assert.equal(res.status, 409);
      assert.equal(res.body.error.code, 'in_use');
      assert.equal((await call('DELETE', '/api/admin/categories/cat_all')).body.error.code, 'in_use');
      assert.equal((await call('PATCH', '/api/admin/categories/cat_all', { name: 'x' })).body.error.code, 'in_use');
      assert.equal((await call('GET', '/api/admin/categories/cat_all')).body.name, 'All');
      assert.equal((await call('POST', '/api/admin/categories', { id: 'cat_all', name: 'x' })).status, 409);
    });
  });

  describe('admin food items', () => {
    test('CRUD round trip with customization groups', async () => {
      const created = await call('POST', '/api/admin/food-items', {
        restaurantId: 'rest_mama_ope',
        categoryId: 'cat_rice',
        name: 'Ofada Rice',
        price: 2800,
        imageUrl: '/uploads/ofada.webp',
        spiceLevel: 3,
        customizationGroups: [
          { name: 'Protein', isRequired: true, maxSelectable: 1, options: [{ name: 'Beef' }, { id: 'o_goat', name: 'Goat', extraPrice: 500 }] },
        ],
      });
      assert.equal(created.status, 201, JSON.stringify(created.body));
      const food = created.body;
      assert.match(food.id, /^food_[0-9a-f]+$/);
      assert.equal(food.isAvailable, true);
      assert.equal(food.price, 2800);
      assert.match(food.customizationGroups[0].id, /^grp_/);
      assert.match(food.customizationGroups[0].options[0].id, /^opt_/);
      assert.equal(food.customizationGroups[0].options[0].extraPrice, 0);
      assert.equal(food.customizationGroups[0].options[1].id, 'o_goat');

      const hidden = await call('PATCH', `/api/admin/food-items/${food.id}`, { isAvailable: false, price: 3000.25 });
      assert.equal(hidden.body.isAvailable, false);
      assert.equal(hidden.body.price, 3000.25);
      assert.equal(hidden.body.name, 'Ofada Rice');

      // Unavailable items: hidden from customers, still visible to admins
      assert.equal((await call('GET', `/api/food-items/${food.id}`)).status, 404);
      assert.equal((await call('GET', `/api/admin/food-items/${food.id}`)).body.isAvailable, false);
      const byRestaurant = await call('GET', '/api/admin/food-items?restaurantId=rest_mama_ope&categoryId=cat_rice&q=OFADA');
      assert.deepEqual(byRestaurant.body.map((f) => f.id), [food.id]);

      assert.equal((await call('DELETE', `/api/admin/food-items/${food.id}`)).status, 204);
      assert.equal((await call('GET', `/api/admin/food-items/${food.id}`)).status, 404);
    });

    test('round-trips an existing item unchanged', async () => {
      const existing = (await call('GET', '/api/admin/food-items/food_jellof_rice')).body;
      const res = await call('PATCH', '/api/admin/food-items/food_jellof_rice', existing);
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.deepEqual(res.body, existing);
    });

    test('validates references and option ids', async () => {
      const body = { restaurantId: 'rest_mama_ope', categoryId: 'cat_rice', name: 'X', price: 100 };
      assert.equal((await call('POST', '/api/admin/food-items', { ...body, restaurantId: 'nope' })).status, 400);
      assert.equal((await call('POST', '/api/admin/food-items', { ...body, categoryId: 'cat_all' })).status, 400);
      assert.equal((await call('POST', '/api/admin/food-items', { ...body, price: -1 })).status, 400);
      const dup = await call('POST', '/api/admin/food-items', {
        ...body,
        customizationGroups: [{ name: 'G', options: [{ id: 'a', name: 'A' }, { id: 'a', name: 'B' }] }],
      });
      assert.equal(dup.status, 400);
    });

    test('lists every item including unavailable ones', async () => {
      const all = (await call('GET', '/api/admin/food-items')).body;
      const publicCount = (await call('GET', '/api/food-items')).body.length;
      assert.ok(all.length >= publicCount);
      assert.ok('isAvailable' in all[0]);
    });
  });

  describe('admin orders, users and stats', () => {
    let orderId;
    let customer;

    before(async () => {
      const reg = await call('POST', '/api/auth/register', { name: 'Tunde Adeleke', phone: uniquePhone(), password: 'secret123' }, {});
      customer = reg.body;
      const placed = await call('POST', '/api/orders', {
        items: [{ foodItemId: 'food_jellof_rice', quantity: 2, optionIds: ['p_chk'] }],
        deliveryAddress: 'Unity Block, Minna',
        paymentMethod: 'Cash on Delivery',
      }, bearer(customer.token));
      assert.equal(placed.status, 201, JSON.stringify(placed.body));
      orderId = placed.body.id;
    });

    test('stats', async () => {
      const res = await call('GET', '/api/admin/stats');
      assert.equal(res.status, 200);
      const s = res.body;
      assert.ok(s.ordersToday >= 1);
      assert.ok(s.revenueToday >= 7000);
      assert.equal(typeof s.revenueToday, 'number');
      assert.ok(s.activeOrders >= 1);
      assert.ok(s.totalOrders >= 1);
      for (const k of ['restaurants', 'foodItems', 'categories', 'users', 'riders']) assert.equal(typeof s[k], 'number');
      assert.equal(s.users, 1);
      assert.deepEqual(Object.keys(s.ordersByStatus),
        ['placed', 'preparing', 'riderAssigned', 'outForDelivery', 'delivered', 'cancelled']);
      assert.ok(s.recentOrders.length >= 1 && s.recentOrders.length <= 5);
      assert.equal(s.recentOrders[0].id, orderId);
    });

    test('list, filter, search and paginate orders', async () => {
      const all = await call('GET', '/api/admin/orders');
      assert.equal(all.status, 200);
      assert.ok(all.body.total >= 1);
      assert.ok(all.body.items.some((o) => o.id === orderId));

      const byName = await call('GET', '/api/admin/orders?status=placed');
      const byCode = await call('GET', '/api/admin/orders?status=0');
      assert.deepEqual(byName.body, byCode.body);
      assert.ok(byName.body.items.every((o) => o.status === 0));
      assert.equal((await call('GET', '/api/admin/orders?status=delivered')).body.items.length, 0);
      assert.equal((await call('GET', '/api/admin/orders?status=nope')).status, 400);
      assert.equal((await call('GET', '/api/admin/orders?status=9')).status, 400);

      const search = await call('GET', `/api/admin/orders?q=${orderId}`);
      assert.deepEqual(search.body.items.map((o) => o.id), [orderId]);
      assert.equal((await call('GET', '/api/admin/orders?q=unity%20block')).body.total >= 1, true);
      assert.equal((await call('GET', '/api/admin/orders?q=tunde')).body.total >= 1, true);

      const page = await call('GET', '/api/admin/orders?limit=1&offset=0');
      assert.equal(page.body.items.length, 1);
      assert.equal(page.body.total, all.body.total);
    });

    test('get, advance and cancel an order', async () => {
      const one = await call('GET', `/api/admin/orders/${orderId}`);
      assert.equal(one.body.id, orderId);
      assert.equal(one.body.deliveryAddress, 'Unity Block, Minna');
      assert.equal(one.body.userId, customer.user.id);
      assert.equal(one.body.customerName, 'Tunde Adeleke');
      assert.equal(one.body.customerPhone, customer.user.phone);
      assert.deepEqual(one.body.customer, { id: customer.user.id, name: 'Tunde Adeleke', phone: customer.user.phone });
      assert.equal(one.body.contactPhone, customer.user.phone);
      assert.equal(one.body.rider, null);
      assert.equal(typeof one.body.total, 'number');
      assert.equal((await call('GET', '/api/admin/orders/CB-000000')).status, 404);

      assert.equal((await call('POST', `/api/admin/orders/${orderId}/advance`)).body.status, 1);
      assert.equal((await call('POST', `/api/admin/orders/${orderId}/cancel`)).body.status, 5);
      assert.equal((await call('POST', `/api/admin/orders/${orderId}/cancel`)).status, 409);
    });

    test('users include role, phone and order counts; ?role filter', async () => {
      const res = await call('GET', '/api/admin/users');
      assert.equal(res.status, 200);
      const u = res.body.find((x) => x.id === customer.user.id);
      assert.ok(u.orderCount >= 1);
      assert.equal(u.role, 'customer');
      assert.equal(u.phone, customer.user.phone);
      assert.ok(!Object.keys(u).some((k) => /password/i.test(k)));
      await newRider('Listed Rider');
      const riders = (await call('GET', '/api/admin/users?role=rider')).body;
      assert.ok(riders.length >= 1 && riders.every((x) => x.role === 'rider'));
      const customers = (await call('GET', '/api/admin/users?role=customer')).body;
      assert.ok(customers.length >= 1 && customers.every((x) => x.role === 'customer'));
      assert.equal((await call('GET', '/api/admin/users?role=admin')).status, 400);
    });

    test('assign, reassign, unassign and advance rules', async () => {
      const r1 = await newRider('Rider One');
      const r2 = await newRider('Rider Two');
      const placed = await call('POST', '/api/orders', {
        items: [{ foodItemId: 'food_zobo', quantity: 1, optionIds: ['zb_ice'] }], deliveryAddress: 'Tunga, Minna', paymentMethod: 'Cash on Delivery',
      }, bearer(customer.token));
      const id = placed.body.id;

      // assigning straight from placed is allowed, and reassigning
      const a1 = await call('POST', `/api/admin/orders/${id}/assign`, { riderId: r1.id });
      assert.equal(a1.status, 200, JSON.stringify(a1.body));
      assert.equal(a1.body.status, 2);
      assert.equal(a1.body.rider.id, r1.id);
      const a2 = await call('POST', `/api/admin/orders/${id}/assign`, { riderId: r2.id });
      assert.equal(a2.body.rider.id, r2.id, 'reassign');

      assert.equal((await call('POST', `/api/admin/orders/${id}/assign`, { riderId: 'nope' })).status, 400);
      assert.equal((await call('POST', `/api/admin/orders/${id}/assign`, { riderId: customer.user.id })).status, 400);
      assert.equal((await call('POST', `/api/admin/orders/${id}/assign`, {})).status, 400);
      assert.equal((await call('POST', '/api/admin/orders/CB-000000/assign', { riderId: r1.id })).status, 404);

      // r2 has an active order → can't be deleted
      const del = await call('DELETE', `/api/admin/riders/${r2.id}`);
      assert.equal(del.status, 409);
      assert.equal(del.body.error.code, 'in_use');

      const un = await call('POST', `/api/admin/orders/${id}/unassign`);
      assert.equal(un.body.status, 1);
      assert.equal(un.body.rider, null);
      assert.equal((await call('POST', `/api/admin/orders/${id}/unassign`)).body.error.code, 'invalid_status');
      assert.equal((await call('POST', `/api/admin/orders/${id}/advance`)).body.error.code, 'rider_required');

      // deactivated riders can't be assigned
      assert.equal((await call('DELETE', `/api/admin/riders/${r2.id}`)).status, 204);
      assert.equal((await call('POST', `/api/admin/orders/${id}/assign`, { riderId: r2.id })).status, 400);

      // admin override: riderAssigned → outForDelivery → delivered
      await call('POST', `/api/admin/orders/${id}/assign`, { riderId: r1.id });
      assert.equal((await call('POST', `/api/admin/orders/${id}/advance`)).body.status, 3);
      assert.equal((await call('POST', `/api/admin/orders/${id}/advance`)).body.status, 4);
      assert.equal((await call('POST', `/api/admin/orders/${id}/advance`)).status, 409);
      const done = await call('POST', `/api/admin/orders/${id}/assign`, { riderId: r1.id });
      assert.equal(done.status, 409);
      assert.equal(done.body.error.code, 'invalid_status');
    });
  });

  describe('admin riders', () => {
    test('CRUD round trip', async () => {
      const phone = uniquePhone();
      const created = await call('POST', '/api/admin/riders', {
        name: 'Femi Balogun', phone, password: 'rider-pass', vehicle: 'Bajaj Boxer', plateNumber: 'LAG-542-KJ', email: 'Femi@Example.com',
      });
      assert.equal(created.status, 201, JSON.stringify(created.body));
      const r = created.body;
      assert.deepEqual(Object.keys(r).sort(), ['activeOrders', 'createdAt', 'deliveredOrders', 'email', 'id', 'isActive',
        'name', 'phone', 'plateNumber', 'vehicle'].sort());
      assert.equal(r.phone, `+234${phone.slice(1)}`);
      assert.equal(r.email, 'femi@example.com');
      assert.equal(r.isActive, true);
      assert.equal(r.activeOrders, 0);
      assert.equal(r.deliveredOrders, 0);

      const dup = await call('POST', '/api/admin/riders', { name: 'X', phone, password: 'rider-pass', vehicle: 'Bike' });
      assert.equal(dup.status, 409);
      assert.equal(dup.body.error.code, 'phone_taken');
      const badPhone = await call('POST', '/api/admin/riders', { name: 'X', phone: '123', password: 'rider-pass', vehicle: 'Bike' });
      assert.equal(badPhone.body.error.code, 'invalid_phone');
      assert.equal((await call('POST', '/api/admin/riders', { name: 'X', phone: uniquePhone(), password: 'rider-pass' })).status, 400);

      assert.ok((await call('GET', '/api/admin/riders')).body.some((x) => x.id === r.id));

      const newPhone = uniquePhone();
      const patched = await call('PATCH', `/api/admin/riders/${r.id}`, { name: 'Femi B.', phone: newPhone, plateNumber: null, password: 'new-pass-1' });
      assert.equal(patched.status, 200, JSON.stringify(patched.body));
      assert.equal(patched.body.name, 'Femi B.');
      assert.equal(patched.body.vehicle, 'Bajaj Boxer');
      assert.equal(patched.body.plateNumber, null);
      assert.equal(patched.body.email, 'femi@example.com');
      assert.equal((await call('POST', '/api/auth/login', { phone: newPhone, password: 'new-pass-1' }, {})).status, 200);
      assert.equal((await call('POST', '/api/auth/login', { phone: newPhone, password: 'rider-pass' }, {})).status, 401);

      const other = await newRider('Other');
      const taken = await call('PATCH', `/api/admin/riders/${other.id}`, { phone: newPhone });
      assert.equal(taken.status, 409);
      assert.equal(taken.body.error.code, 'phone_taken');
      assert.equal((await call('PATCH', '/api/admin/riders/nope', { name: 'x' })).status, 404);

      assert.equal((await call('DELETE', `/api/admin/riders/${r.id}`)).status, 204);
      const gone = (await call('GET', '/api/admin/riders')).body.find((x) => x.id === r.id);
      assert.equal(gone.isActive, false);
      const disabled = await call('POST', '/api/auth/login', { phone: newPhone, password: 'new-pass-1' }, {});
      assert.equal(disabled.body.error.code, 'account_disabled');
      assert.equal((await call('PATCH', `/api/admin/riders/${r.id}`, { isActive: true })).body.isActive, true);
      assert.equal((await call('DELETE', '/api/admin/riders/nope')).status, 404);
    });

    test('stats count active riders', async () => {
      const before = (await call('GET', '/api/admin/stats')).body.riders;
      const r = await newRider('Counted');
      assert.equal((await call('GET', '/api/admin/stats')).body.riders, before + 1);
      await call('DELETE', `/api/admin/riders/${r.id}`);
      assert.equal((await call('GET', '/api/admin/stats')).body.riders, before);
    });
  });

  describe('admin uploads', () => {
    test('accepts PNG, JPEG and WebP and serves them back', async () => {
      for (const [bytes, type, ext] of [[PNG, 'image/png', 'png'], [JPEG, 'image/jpeg', 'jpg'], [WEBP, 'image/webp', 'webp']]) {
        const res = await upload(bytes, { type, filename: `x.${ext}` });
        assert.equal(res.status, 201, JSON.stringify(res.body));
        assert.match(res.body.url, new RegExp(`^/uploads/[0-9a-f]{32}\\.${ext}$`));
        assert.ok(existsSync(join(uploadDir, res.body.url.slice('/uploads/'.length))));

        const served = await fetch(base + res.body.url);
        assert.equal(served.status, 200);
        assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
        assert.match(served.headers.get('cache-control'), /max-age=31536000/);
        assert.deepEqual(Buffer.from(await served.arrayBuffer()), bytes);
      }
    });

    test('uploaded paths are accepted as image URLs', async () => {
      const { body } = await upload(PNG);
      const res = await call('PATCH', '/api/admin/restaurants/rest_mama_ope', { logoUrl: body.url });
      assert.equal(res.body.logoUrl, body.url);
    });

    test('rejects wrong magic bytes, wrong types, wrong field, oversize and no auth', async () => {
      const fake = await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), { type: 'image/png' });
      assert.equal(fake.status, 415);
      assert.equal((await upload(PNG, { type: 'image/gif', filename: 'x.gif' })).status, 415);
      assert.equal((await upload(PNG, { type: 'image/svg+xml', filename: 'x.svg' })).status, 415);
      assert.equal((await upload(PNG, { field: 'file' })).status, 400);
      const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
      const tooBig = await upload(big);
      assert.equal(tooBig.status, 413);
      assert.equal(tooBig.body.error.code, 'file_too_large');
      assert.equal((await upload(PNG, { headers: {} })).status, 401);
      const json = await call('POST', '/api/admin/uploads', { image: 'x' });
      assert.equal(json.status, 400);
    });

    test('missing upload → JSON 404', async () => {
      const res = await fetch(`${base}/uploads/does-not-exist.png`);
      assert.equal(res.status, 404);
    });
  });
});
