import { randomInt } from 'node:crypto';
import { ORDER_STATUS } from '../config.js';
import { transaction } from '../db/index.js';
import { ApiError } from '../lib/errors.js';
import { iso, likeArg, num } from './catalog.js';

const S = ORDER_STATUS;
const ACTIVE = [S.placed, S.preparing, S.riderAssigned, S.outForDelivery];
const ON_THE_ROAD = [S.riderAssigned, S.outForDelivery];
const ASSIGNABLE = [S.placed, S.preparing, S.riderAssigned];

export const invalidStatus = (message) => new ApiError(409, 'invalid_status', message);

/** Public Order shape (customer API). */
const orderFromRow = (r) => ({
  id: r.id,
  items: r.items,
  subtotal: num(r.subtotal),
  deliveryFee: num(r.delivery_fee),
  serviceFee: num(r.service_fee),
  packagingFee: num(r.packaging_fee),
  discount: num(r.discount),
  total: num(r.total),
  promoCode: r.promo_code,
  status: r.status,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
  deliveryAddress: r.delivery_address,
  contactPhone: r.contact_phone,
  paymentMethod: r.payment_method,
  rider: r.rider_id
    ? { id: r.rider_id, name: r.rider_name, phone: r.rider_phone, vehicle: r.rider_vehicle }
    : null,
  // Flat rider fields kept for older clients.
  riderName: r.rider_id ? r.rider_name : null,
  riderPhone: r.rider_id ? r.rider_phone : null,
  riderVehicle: r.rider_id ? r.rider_vehicle : null,
  riderRating: r.rider_id ? num(r.rider_rating) : null,
  estimatedDeliveryMinutes: r.estimated_delivery_minutes,
});

/** Rider view: the order plus who to deliver to. */
const riderOrderFromRow = (r) => ({
  ...orderFromRow(r),
  customer: { name: r.customer_name ?? null, phone: r.customer_phone ?? null },
});

/** Staff view: the public Order plus who placed it. */
const adminOrderFromRow = (r) => ({
  ...orderFromRow(r),
  userId: r.user_id,
  customerName: r.customer_name ?? null,
  customerPhone: r.customer_phone ?? null,
  customer: { id: r.user_id, name: r.customer_name ?? null, phone: r.customer_phone ?? null },
});

const FROM = `FROM orders o
  LEFT JOIN users cu ON cu.id = o.user_id
  LEFT JOIN riders rd ON rd.user_id = o.rider_id
  LEFT JOIN users ru ON ru.id = o.rider_id`;
const SELECT = `SELECT o.*, ru.name AS rider_name, ru.phone AS rider_phone, rd.vehicle AS rider_vehicle,
  rd.rating AS rider_rating, cu.name AS customer_name, cu.phone AS customer_phone ${FROM}`;

const STATUS_NAMES = Object.fromEntries(Object.entries(ORDER_STATUS).map(([name, code]) => [code, name]));

export function createOrderRepository(pool) {
  const getRow = async (id, db = pool) => (await db.query(`${SELECT} WHERE o.id = $1`, [id])).rows[0] ?? null;
  /** Lock the order row for a status change inside a transaction. */
  const lockRow = async (db, id) => (await db.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id])).rows[0] ?? null;
  const setStatus = (db, id, status, riderId) => (riderId === undefined
    ? db.query('UPDATE orders SET status = $1, updated_at = now() WHERE id = $2', [status, id])
    : db.query('UPDATE orders SET status = $1, rider_id = $2, updated_at = now() WHERE id = $3', [status, riderId, id]));

  const newId = async (db) => {
    for (;;) {
      const id = `CB-${randomInt(100000, 1000000)}`;
      if (!(await db.query('SELECT 1 FROM orders WHERE id = $1', [id])).rowCount) return id;
    }
  };

  const adminList = async ({ status, q, limit = 50, offset = 0 } = {}) => {
    const where = ['TRUE'];
    const args = [];
    if (status !== undefined) { args.push(status); where.push(`o.status = $${args.length}`); }
    const term = q?.trim();
    if (term) {
      args.push(likeArg(term));
      const n = `$${args.length}`;
      const cols = ['o.id', 'o.delivery_address', 'o.payment_method', 'o.contact_phone', 'cu.name', 'cu.email', 'cu.phone', 'ru.name'];
      where.push(`(${cols.map((c) => `${c} ILIKE ${n} ESCAPE '\\'`).join(' OR ')})`);
    }
    const cond = where.join(' AND ');
    const total = (await pool.query(`SELECT COUNT(*)::int AS n ${FROM} WHERE ${cond}`, args)).rows[0].n;
    const { rows } = await pool.query(
      `${SELECT} WHERE ${cond} ORDER BY o.created_at DESC, o.id LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
      [...args, limit, offset]);
    return { items: rows.map(adminOrderFromRow), total };
  };

  return {
    // ---- Customer ----------------------------------------------------------------------------

    async get(id, userId) {
      const row = await getRow(id);
      if (!row || (userId && row.user_id !== userId)) return null;
      return orderFromRow(row);
    },

    async listForUser(userId, { active } = {}) {
      let sql = `${SELECT} WHERE o.user_id = $1`;
      if (active === true) sql += ` AND o.status IN (${ACTIVE.join(',')})`;
      if (active === false) sql += ` AND o.status NOT IN (${ACTIVE.join(',')})`;
      const { rows } = await pool.query(`${sql} ORDER BY o.created_at DESC, o.id`, [userId]);
      return rows.map(orderFromRow);
    },

    async create({ userId, items, pricing, deliveryAddress, contactPhone, paymentMethod, estimatedDeliveryMinutes }) {
      return transaction(pool, async (db) => {
        const id = await newId(db);
        await db.query(`INSERT INTO orders (id, user_id, items, subtotal, delivery_fee, service_fee,
          packaging_fee, discount, total, promo_code, status, delivery_address, contact_phone,
          payment_method, estimated_delivery_minutes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`, [
          id, userId, JSON.stringify(items), pricing.subtotal, pricing.deliveryFee, pricing.serviceFee,
          pricing.packagingFee, pricing.discount, pricing.total, pricing.promoCode,
          S.placed, deliveryAddress, contactPhone, paymentMethod, estimatedDeliveryMinutes,
        ]);
        return orderFromRow(await getRow(id, db));
      });
    },

    /** Customers may cancel until the kitchen starts cooking; staff may cancel any active order. */
    async cancel(id, { userId, asStaff = false }) {
      return transaction(pool, async (db) => {
        const row = await lockRow(db, id);
        if (!row || (!asStaff && row.user_id !== userId)) throw ApiError.notFound('Order');
        if (!ACTIVE.includes(row.status)) throw ApiError.conflict('Order is already completed or cancelled');
        if (!asStaff && row.status !== S.placed) {
          throw ApiError.conflict('The kitchen has started on this order, so it can no longer be cancelled');
        }
        await setStatus(db, id, S.cancelled);
        return orderFromRow(await getRow(id, db));
      });
    },

    // ---- Rider -------------------------------------------------------------------------------

    /** active = riderAssigned | outForDelivery (oldest first); completed = delivered | cancelled (latest 50). */
    async listForRider(riderId, { scope = 'active' } = {}) {
      const sql = scope === 'completed'
        ? `${SELECT} WHERE o.rider_id = $1 AND o.status IN (${S.delivered}, ${S.cancelled})
           ORDER BY o.updated_at DESC, o.id LIMIT 50`
        : `${SELECT} WHERE o.rider_id = $1 AND o.status IN (${ON_THE_ROAD.join(',')})
           ORDER BY o.created_at, o.id`;
      const { rows } = await pool.query(sql, [riderId]);
      return rows.map(riderOrderFromRow);
    },

    async getForRider(id, riderId) {
      const row = await getRow(id);
      return row && row.rider_id === riderId ? riderOrderFromRow(row) : null;
    },

    /** Rider moves their own order `from` → `to`. 404 if not theirs, 409 invalid_status otherwise. */
    async riderTransition(id, riderId, from, to) {
      return transaction(pool, async (db) => {
        const row = await lockRow(db, id);
        if (!row || row.rider_id !== riderId) throw ApiError.notFound('Order');
        if (row.status !== from) {
          throw invalidStatus(`Order is ${STATUS_NAMES[row.status]}; it must be ${STATUS_NAMES[from]} for this action`);
        }
        await setStatus(db, id, to);
        return riderOrderFromRow(await getRow(id, db));
      });
    },

    // ---- Admin (staff dashboard) -------------------------------------------------------------

    async adminGet(id) {
      const row = await getRow(id);
      return row ? adminOrderFromRow(row) : null;
    },

    /** Newest first. `q` matches order id, address, payment method, contact phone, customer name/email/phone or rider name. */
    adminList,

    /** Order figures for the dashboard; "today" starts at local midnight on the server. */
    async stats(now = new Date()) {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const today = (await pool.query(`SELECT COUNT(*)::int AS n,
          COALESCE(SUM(CASE WHEN status <> $1 THEN total ELSE 0 END), 0) AS revenue
        FROM orders WHERE created_at >= $2`, [S.cancelled, startOfDay])).rows[0];
      const ordersByStatus = Object.fromEntries(Object.keys(ORDER_STATUS).map((name) => [name, 0]));
      const { rows } = await pool.query('SELECT status, COUNT(*)::int AS n FROM orders GROUP BY status');
      for (const row of rows) {
        if (STATUS_NAMES[row.status]) ordersByStatus[STATUS_NAMES[row.status]] = row.n;
      }
      return {
        ordersToday: today.n,
        revenueToday: num(today.revenue),
        activeOrders: ACTIVE.reduce((sum, code) => sum + ordersByStatus[STATUS_NAMES[code]], 0),
        totalOrders: Object.values(ordersByStatus).reduce((a, b) => a + b, 0),
        ordersByStatus,
        recentOrders: (await adminList({ limit: 5 })).items,
      };
    },

    /**
     * Staff action: one step along the flow. placed → preparing; riderAssigned → outForDelivery →
     * delivered (override for riders). preparing needs a rider: 409 rider_required (use /assign).
     */
    async advance(id) {
      await transaction(pool, async (db) => {
        const row = await lockRow(db, id);
        if (!row) throw ApiError.notFound('Order');
        const next = {
          [S.placed]: S.preparing,
          [S.riderAssigned]: S.outForDelivery,
          [S.outForDelivery]: S.delivered,
        }[row.status];
        if (row.status === S.preparing) {
          throw new ApiError(409, 'rider_required', 'Assign a rider to move this order on (POST /orders/:id/assign)');
        }
        if (next === undefined) throw ApiError.conflict('Order is already completed or cancelled');
        await setStatus(db, id, next);
      });
    },

    /** Assign (or reassign) a rider; status becomes riderAssigned. */
    async assign(id, riderId) {
      await transaction(pool, async (db) => {
        const row = await lockRow(db, id);
        if (!row) throw ApiError.notFound('Order');
        const rider = (await db.query(`SELECT u.is_active FROM users u JOIN riders rd ON rd.user_id = u.id
          WHERE u.id = $1 AND u.role = 'rider'`, [riderId])).rows[0];
        if (!rider) throw new ApiError(400, 'invalid_rider', `'${riderId}' is not a rider`);
        if (!rider.is_active) throw new ApiError(400, 'invalid_rider', 'This rider is deactivated');
        if (!ASSIGNABLE.includes(row.status)) {
          throw invalidStatus(`Riders can only be assigned while an order is placed, preparing or riderAssigned (it is ${STATUS_NAMES[row.status]})`);
        }
        await setStatus(db, id, S.riderAssigned, riderId);
      });
    },

    /** Take the rider off an order that has not been picked up yet; back to preparing. */
    async unassign(id) {
      await transaction(pool, async (db) => {
        const row = await lockRow(db, id);
        if (!row) throw ApiError.notFound('Order');
        if (row.status !== S.riderAssigned) {
          throw invalidStatus(`Only riderAssigned orders can be unassigned (it is ${STATUS_NAMES[row.status]})`);
        }
        await setStatus(db, id, S.preparing, null);
      });
    },
  };
}
