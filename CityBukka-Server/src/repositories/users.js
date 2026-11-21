import { randomBytes } from 'node:crypto';
import { transaction } from '../db/index.js';
import { ApiError } from '../lib/errors.js';
import { foodItemFromRow, iso, restaurantFromRow } from './catalog.js';

/**
 * Internal user record: the public `User` JSON plus `isActive`.
 * Use `publicUser()` before sending it to a client.
 */
const userFromRow = (r) => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  email: r.email ?? null,
  role: r.role,
  avatarUrl: r.avatar_url,
  savedAddresses: r.saved_addresses,
  selectedAddress: r.selected_address,
  isDarkMode: r.is_dark_mode,
  loyaltyPoints: r.loyalty_points,
  createdAt: iso(r.created_at),
  isActive: r.is_active,
});

/** `{id, name, phone, email, role, avatarUrl, savedAddresses, selectedAddress, isDarkMode, loyaltyPoints, createdAt}` */
export const publicUser = ({ isActive, ...user }) => user;

const riderFromRow = (r) => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  email: r.email ?? null,
  vehicle: r.vehicle,
  plateNumber: r.plate_number ?? null,
  isActive: r.is_active,
  activeOrders: r.active_orders ?? 0,
  deliveredOrders: r.delivered_orders ?? 0,
  createdAt: iso(r.created_at),
});

const PROFILE_COLUMNS = {
  name: 'name',
  email: 'email',
  avatarUrl: 'avatar_url',
  savedAddresses: 'saved_addresses',
  selectedAddress: 'selected_address',
  isDarkMode: 'is_dark_mode',
};

export const phoneTaken = () =>
  new ApiError(409, 'phone_taken', 'An account with this phone number already exists');

const isUniqueViolation = (err) => err?.code === '23505';
const newUserId = (prefix) => `${prefix}_${randomBytes(8).toString('hex')}`;

const RIDER_SELECT = `SELECT u.id, u.name, u.phone, u.email, u.is_active, u.created_at,
    rd.vehicle, rd.plate_number, rd.rating,
    (SELECT COUNT(*)::int FROM orders o WHERE o.rider_id = u.id AND o.status IN (2, 3)) AS active_orders,
    (SELECT COUNT(*)::int FROM orders o WHERE o.rider_id = u.id AND o.status = 4) AS delivered_orders
  FROM users u JOIN riders rd ON rd.user_id = u.id
  WHERE u.role = 'rider'`;

export function createUserRepository(pool) {
  const one = async (db, sql, args) => (await db.query(sql, args)).rows[0] ?? null;

  const getRider = async (id, db = pool) => {
    const row = await one(db, `${RIDER_SELECT} AND u.id = $1`, [id]);
    return row ? riderFromRow(row) : null;
  };

  const insertUser = async (db, { id, role, name, phone, email, passwordHash }) => {
    try {
      await db.query(`INSERT INTO users (id, role, name, phone, email, password_hash)
        VALUES ($1, $2, $3, $4, $5, $6)`, [id, role, name, phone, email ?? null, passwordHash]);
    } catch (err) {
      if (isUniqueViolation(err)) throw phoneTaken();
      throw err;
    }
  };

  return {
    async get(id, db = pool) {
      const row = await one(db, 'SELECT * FROM users WHERE id = $1', [id]);
      return row ? userFromRow(row) : null;
    },

    /** For login: the user plus their password hash, looked up by normalised phone. */
    async findByPhoneWithHash(phone) {
      const row = await one(pool, 'SELECT * FROM users WHERE phone = $1', [phone]);
      return row ? { user: userFromRow(row), passwordHash: row.password_hash } : null;
    },

    async phoneExists(phone, exceptId = null) {
      return !!(await one(pool, 'SELECT 1 FROM users WHERE phone = $1 AND id IS DISTINCT FROM $2', [phone, exceptId]));
    },

    /** New customer account. 409 phone_taken if the phone is already registered. */
    async createCustomer({ name, phone, email, passwordHash }) {
      const id = newUserId('user');
      await insertUser(pool, { id, role: 'customer', name, phone, email, passwordHash });
      return this.get(id);
    },

    async count() {
      return (await one(pool, "SELECT COUNT(*)::int AS n FROM users WHERE role = 'customer'")).n;
    },

    /** Staff view: users (optionally one role) with how many orders they have placed. */
    async listWithOrderCount({ role } = {}) {
      const args = [];
      let where = '';
      if (role) { args.push(role); where = 'WHERE u.role = $1'; }
      const { rows } = await pool.query(`SELECT u.*,
          (SELECT COUNT(*)::int FROM orders o WHERE o.user_id = u.id) AS order_count
        FROM users u ${where} ORDER BY lower(u.name), u.id`, args);
      return rows.map((r) => ({ ...publicUser(userFromRow(r)), isActive: r.is_active, orderCount: r.order_count }));
    },

    async update(id, changes) {
      const sets = [];
      const args = [];
      for (const [key, value] of Object.entries(changes)) {
        const column = PROFILE_COLUMNS[key];
        if (!column || value === undefined) continue;
        args.push(key === 'savedAddresses' ? JSON.stringify(value) : value);
        sets.push(`${column} = $${args.length}`);
      }
      if (sets.length) {
        args.push(id);
        await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${args.length}`, args);
      }
      return this.get(id);
    },

    // ---- Favourites --------------------------------------------------------------------------

    async favoriteIds(userId) {
      const { rows } = await pool.query(
        'SELECT kind, target_id FROM favorites WHERE user_id = $1 ORDER BY created_at', [userId]);
      return {
        foodIds: rows.filter((r) => r.kind === 'food').map((r) => r.target_id),
        restaurantIds: rows.filter((r) => r.kind === 'restaurant').map((r) => r.target_id),
      };
    },

    async favoriteFoodItems(userId) {
      const { rows } = await pool.query(`SELECT f.* FROM favorites fav JOIN food_items f ON f.id = fav.target_id
        WHERE fav.user_id = $1 AND fav.kind = 'food' ORDER BY fav.created_at`, [userId]);
      return rows.map(foodItemFromRow);
    },

    async favoriteRestaurants(userId) {
      const { rows } = await pool.query(`SELECT r.* FROM favorites fav JOIN restaurants r ON r.id = fav.target_id
        WHERE fav.user_id = $1 AND fav.kind = 'restaurant' ORDER BY fav.created_at`, [userId]);
      return rows.map(restaurantFromRow);
    },

    async addFavorite(userId, kind, targetId) {
      await pool.query(`INSERT INTO favorites (user_id, kind, target_id) VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING`, [userId, kind, targetId]);
    },

    async removeFavorite(userId, kind, targetId) {
      await pool.query('DELETE FROM favorites WHERE user_id = $1 AND kind = $2 AND target_id = $3',
        [userId, kind, targetId]);
    },

    // ---- Riders (users with role 'rider' + a riders row) -------------------------------------

    /** `{vehicle, plateNumber, isActive, rating}` for a rider's own profile. */
    async riderProfile(userId) {
      const r = await getRider(userId);
      return r && { vehicle: r.vehicle, plateNumber: r.plateNumber, isActive: r.isActive };
    },

    async listRiders() {
      const { rows } = await pool.query(`${RIDER_SELECT} ORDER BY lower(u.name), u.id`);
      return rows.map(riderFromRow);
    },

    getRider,

    async countActiveRiders() {
      return (await one(pool, `SELECT COUNT(*)::int AS n FROM users u JOIN riders rd ON rd.user_id = u.id
        WHERE u.role = 'rider' AND u.is_active`)).n;
    },

    async createRider({ name, phone, email, passwordHash, vehicle, plateNumber }) {
      const id = newUserId('rider');
      return transaction(pool, async (db) => {
        await insertUser(db, { id, role: 'rider', name, phone, email, passwordHash });
        await db.query('INSERT INTO riders (user_id, vehicle, plate_number) VALUES ($1, $2, $3)',
          [id, vehicle, plateNumber ?? null]);
        return getRider(id, db);
      });
    },

    /** Partial update; `passwordHash` replaces the password. 404 if not a rider, 409 phone_taken. */
    async updateRider(id, { name, phone, email, vehicle, plateNumber, isActive, passwordHash }) {
      return transaction(pool, async (db) => {
        if (!(await getRider(id, db))) throw ApiError.notFound('Rider');
        const userSets = { name, phone, email, is_active: isActive, password_hash: passwordHash };
        const riderSets = { vehicle, plate_number: plateNumber };
        const run = async (table, key, sets) => {
          const entries = Object.entries(sets).filter(([, v]) => v !== undefined);
          if (!entries.length) return;
          await db.query(`UPDATE ${table} SET ${entries.map(([c], i) => `${c} = $${i + 1}`).join(', ')}
            WHERE ${key} = $${entries.length + 1}`, [...entries.map(([, v]) => v), id]);
        };
        try {
          await run('users', 'id', userSets);
        } catch (err) {
          if (isUniqueViolation(err)) throw phoneTaken();
          throw err;
        }
        await run('riders', 'user_id', riderSets);
        return getRider(id, db);
      });
    },

    /** Soft delete. 409 in_use while the rider has orders on the road. */
    async deactivateRider(id) {
      await transaction(pool, async (db) => {
        const rider = await one(db, `SELECT u.id FROM users u JOIN riders rd ON rd.user_id = u.id
          WHERE u.id = $1 AND u.role = 'rider' FOR UPDATE OF u`, [id]);
        if (!rider) throw ApiError.notFound('Rider');
        const { n } = await one(db,
          'SELECT COUNT(*)::int AS n FROM orders WHERE rider_id = $1 AND status IN (2, 3)', [id]);
        if (n > 0) throw ApiError.inUse(`Rider still has ${n} active order(s); reassign or finish them first`);
        await db.query('UPDATE users SET is_active = false WHERE id = $1', [id]);
      });
    },
  };
}
