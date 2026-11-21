import { randomBytes } from 'node:crypto';
import { transaction } from '../db/index.js';
import { ApiError } from '../lib/errors.js';

// Row → JSON mappers: these camelCase shapes are the API contract (customer PWA and admin).

/** NUMERIC columns arrive from pg as strings; the API always returns numbers. */
export const num = (v) => (v === null || v === undefined ? v : Number(v));
export const iso = (v) => (v instanceof Date ? v.toISOString() : v);

export const categoryFromRow = (r) => ({
  id: r.id,
  name: r.name,
  iconEmoji: r.icon_emoji,
  description: r.description,
  sortOrder: r.sort_order,
});

export const restaurantFromRow = (r) => ({
  id: r.id,
  name: r.name,
  tagline: r.tagline,
  description: r.description,
  coverImageUrl: r.cover_image_url,
  logoUrl: r.logo_url,
  rating: num(r.rating),
  reviewCount: r.review_count,
  deliveryTimeMin: r.delivery_time_min,
  deliveryTimeMax: r.delivery_time_max,
  deliveryFee: num(r.delivery_fee),
  distanceKm: num(r.distance_km),
  cuisines: r.cuisines,
  isFeatured: r.is_featured,
  isOpen: r.is_open,
  address: r.address,
  badges: r.badges,
});

export const foodItemFromRow = (r) => ({
  id: r.id,
  restaurantId: r.restaurant_id,
  name: r.name,
  description: r.description,
  price: num(r.price),
  imageUrl: r.image_url,
  categoryId: r.category_id,
  spiceLevel: r.spice_level,
  rating: num(r.rating),
  reviewCount: r.review_count,
  calories: r.calories,
  prepTimeMinutes: r.prep_time_minutes,
  isPopular: r.is_popular,
  isChefSpecial: r.is_chef_special,
  isVegetarian: r.is_vegetarian,
  isAvailable: r.is_available,
  customizationGroups: r.customization_groups,
});

/** Escape LIKE wildcards; use with `ILIKE $n ESCAPE '\'`. */
export const likeArg = (q) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/**
 * Pseudo-category the customer app uses for "show everything". It is not stored in the database:
 * it is always listed first, can't hold food items, and can't be edited or deleted.
 */
export const ALL_CATEGORY_ID = 'cat_all';
export const ALL_CATEGORY = Object.freeze({
  id: ALL_CATEGORY_ID, name: 'All', iconEmoji: '🍽️', description: 'Everything on the menu', sortOrder: 0,
});

// API field → column. JSONB columns take JSON.stringify'd values.
const CATEGORY_COLUMNS = { name: 'name', iconEmoji: 'icon_emoji', description: 'description', sortOrder: 'sort_order' };

const RESTAURANT_COLUMNS = {
  name: 'name', tagline: 'tagline', description: 'description', coverImageUrl: 'cover_image_url',
  logoUrl: 'logo_url', rating: 'rating', reviewCount: 'review_count', deliveryTimeMin: 'delivery_time_min',
  deliveryTimeMax: 'delivery_time_max', deliveryFee: 'delivery_fee', distanceKm: 'distance_km',
  cuisines: 'cuisines', isFeatured: 'is_featured', isOpen: 'is_open', address: 'address', badges: 'badges',
};

const FOOD_COLUMNS = {
  restaurantId: 'restaurant_id', categoryId: 'category_id', name: 'name', description: 'description',
  price: 'price', imageUrl: 'image_url', spiceLevel: 'spice_level', rating: 'rating',
  reviewCount: 'review_count', calories: 'calories', prepTimeMinutes: 'prep_time_minutes',
  isPopular: 'is_popular', isChefSpecial: 'is_chef_special', isVegetarian: 'is_vegetarian',
  isAvailable: 'is_available', customizationGroups: 'customization_groups',
};

// Applied on create for any field the request omits.
const CATEGORY_DEFAULTS = { iconEmoji: '🍽️', description: '' };
const RESTAURANT_DEFAULTS = {
  tagline: '', description: '', coverImageUrl: '', logoUrl: '', rating: 0, reviewCount: 0,
  deliveryTimeMin: 20, deliveryTimeMax: 40, deliveryFee: 650, distanceKm: 0, cuisines: [],
  isFeatured: false, isOpen: true, address: '', badges: [],
};
const FOOD_DEFAULTS = {
  description: '', imageUrl: '', spiceLevel: 0, rating: 0, reviewCount: 0, calories: 0,
  prepTimeMinutes: 15, isPopular: false, isChefSpecial: false, isVegetarian: false, isAvailable: true,
  customizationGroups: [],
};

const encode = (v) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : v);
const shortId = (prefix) => `${prefix}_${randomBytes(5).toString('hex')}`;
const fieldError = (path, message) => ApiError.badRequest('Validation failed', [{ path, message }]);

const one = async (db, sql, args) => (await db.query(sql, args)).rows[0] ?? null;
const many = async (db, sql, args) => (await db.query(sql, args)).rows;

export function createCatalogRepository(pool) {
  const count = async (db, sql, args) => (await one(db, sql, args)).n;

  /** Use the caller's id (409 if taken) or generate a fresh `<prefix>_xxxxxxxxxx`. */
  const claimId = async (db, wanted, prefix, table) => {
    const exists = async (id) => !!(await one(db, `SELECT 1 FROM ${table} WHERE id = $1`, [id]));
    if (wanted) {
      if (await exists(wanted) || (table === 'categories' && wanted === ALL_CATEGORY_ID)) {
        throw ApiError.conflict(`id '${wanted}' already exists`);
      }
      return wanted;
    }
    for (;;) {
      const id = shortId(prefix);
      if (!(await exists(id))) return id;
    }
  };

  const insertRow = (db, table, columns, id, data) => {
    const keys = Object.keys(columns).filter((k) => data[k] !== undefined);
    return db.query(`INSERT INTO ${table} (id, ${keys.map((k) => columns[k]).join(', ')})
      VALUES ($1, ${keys.map((_, i) => `$${i + 2}`).join(', ')})`, [id, ...keys.map((k) => encode(data[k]))]);
  };

  const updateRow = async (db, table, columns, id, changes) => {
    const keys = Object.keys(columns).filter((k) => changes[k] !== undefined);
    if (!keys.length) return;
    await db.query(`UPDATE ${table} SET ${keys.map((k, i) => `${columns[k]} = $${i + 1}`).join(', ')}
      WHERE id = $${keys.length + 1}`, [...keys.map((k) => encode(changes[k])), id]);
  };

  const checkDeliveryTimes = ({ deliveryTimeMin, deliveryTimeMax }) => {
    if (deliveryTimeMax < deliveryTimeMin) {
      throw fieldError('deliveryTimeMax', 'Must be greater than or equal to deliveryTimeMin');
    }
  };

  const checkFoodRefs = async (db, { restaurantId, categoryId }) => {
    if (!(await one(db, 'SELECT 1 FROM restaurants WHERE id = $1', [restaurantId]))) {
      throw fieldError('restaurantId', `Unknown restaurant '${restaurantId}'`);
    }
    if (categoryId === ALL_CATEGORY_ID) {
      throw fieldError('categoryId', `'${ALL_CATEGORY_ID}' is a filter, not a real category`);
    }
    if (!(await one(db, 'SELECT 1 FROM categories WHERE id = $1', [categoryId]))) {
      throw fieldError('categoryId', `Unknown category '${categoryId}'`);
    }
  };

  /** Fill in missing group/option ids; option ids must be unique across the whole item. */
  const normalizeGroups = (groups) => {
    const seen = new Set();
    return groups.map((g, gi) => ({
      id: g.id || shortId('grp'),
      name: g.name,
      isRequired: g.isRequired,
      maxSelectable: g.maxSelectable,
      options: g.options.map((o, oi) => {
        const id = o.id || shortId('opt');
        if (seen.has(id)) {
          throw fieldError(`customizationGroups.${gi}.options.${oi}.id`, `Duplicate option id '${id}'`);
        }
        seen.add(id);
        return { id, name: o.name, extraPrice: o.extraPrice };
      }),
    }));
  };

  const getRestaurant = async (id, db = pool) => {
    const row = await one(db, 'SELECT * FROM restaurants WHERE id = $1', [id]);
    return row ? restaurantFromRow(row) : null;
  };
  const getFoodItem = async (id, db = pool) => {
    const row = await one(db, 'SELECT * FROM food_items WHERE id = $1', [id]);
    return row ? foodItemFromRow(row) : null;
  };
  const getCategory = async (id, db = pool) => {
    if (id === ALL_CATEGORY_ID) return { ...ALL_CATEGORY };
    const row = await one(db, 'SELECT * FROM categories WHERE id = $1', [id]);
    return row ? categoryFromRow(row) : null;
  };

  const builtIn = () => ApiError.inUse(`'${ALL_CATEGORY_ID}' is the built-in "All" filter and cannot be changed or deleted`);

  return {
    /** The virtual "All" category first, then stored categories by sortOrder. */
    async listCategories() {
      const rows = await many(pool, 'SELECT * FROM categories ORDER BY sort_order, created_at, id');
      return [{ ...ALL_CATEGORY }, ...rows.map(categoryFromRow)];
    },

    /** Customer search: name, tagline or cuisine contains `query`; optional exact cuisine. */
    async listRestaurants({ query, cuisine } = {}) {
      const where = ['TRUE'];
      const args = [];
      const q = query?.trim();
      if (q) {
        args.push(likeArg(q));
        where.push(`(name ILIKE $1 ESCAPE '\\' OR tagline ILIKE $1 ESCAPE '\\'
          OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(cuisines) c WHERE c ILIKE $1 ESCAPE '\\'))`);
      }
      if (cuisine && cuisine !== 'All') {
        args.push(JSON.stringify([cuisine]));
        where.push(`cuisines @> $${args.length}::jsonb`);
      }
      const rows = await many(pool,
        `SELECT * FROM restaurants WHERE ${where.join(' AND ')} ORDER BY is_featured DESC, rating DESC, name`, args);
      return rows.map(restaurantFromRow);
    },

    getRestaurant,

    /** Customer menu: available items only; `cat_all` means no category filter. */
    async listFoodItems({ categoryId, restaurantId, search, popularOnly } = {}) {
      const where = ['is_available'];
      const args = [];
      if (restaurantId) { args.push(restaurantId); where.push(`restaurant_id = $${args.length}`); }
      if (categoryId && categoryId !== ALL_CATEGORY_ID) { args.push(categoryId); where.push(`category_id = $${args.length}`); }
      if (popularOnly) where.push('is_popular');
      const q = search?.trim();
      if (q) {
        args.push(likeArg(q));
        where.push(`(name ILIKE $${args.length} ESCAPE '\\' OR description ILIKE $${args.length} ESCAPE '\\')`);
      }
      const rows = await many(pool,
        `SELECT * FROM food_items WHERE ${where.join(' AND ')} ORDER BY is_popular DESC, rating DESC, name`, args);
      return rows.map(foodItemFromRow);
    },

    /** Includes unavailable items – the caller decides what to do with them. */
    getFoodItem,

    /** Batch lookup for pricing: Map of id → FoodItem / Restaurant. */
    async foodItemsByIds(ids) {
      const rows = await many(pool, 'SELECT * FROM food_items WHERE id = ANY($1::text[])', [[...new Set(ids)]]);
      return new Map(rows.map((r) => [r.id, foodItemFromRow(r)]));
    },
    async restaurantsByIds(ids) {
      const rows = await many(pool, 'SELECT * FROM restaurants WHERE id = ANY($1::text[])', [[...new Set(ids)]]);
      return new Map(rows.map((r) => [r.id, restaurantFromRow(r)]));
    },

    // ---- Admin (staff dashboard) -------------------------------------------------------------

    async counts() {
      const r = await one(pool, `SELECT
        (SELECT COUNT(*)::int FROM restaurants) AS restaurants,
        (SELECT COUNT(*)::int FROM food_items) AS food_items,
        (SELECT COUNT(*)::int FROM categories) AS categories`);
      // +1: the built-in "All" category is part of every category list.
      return { restaurants: r.restaurants, foodItems: r.food_items, categories: r.categories + 1 };
    },

    async createRestaurant(data) {
      const value = { ...RESTAURANT_DEFAULTS, ...data };
      checkDeliveryTimes(value);
      return transaction(pool, async (db) => {
        const id = await claimId(db, data.id, 'rest', 'restaurants');
        await insertRow(db, 'restaurants', RESTAURANT_COLUMNS, id, value);
        return getRestaurant(id, db);
      });
    },

    async updateRestaurant(id, changes) {
      return transaction(pool, async (db) => {
        const current = await getRestaurant(id, db);
        if (!current) throw ApiError.notFound('Restaurant');
        checkDeliveryTimes({ ...current, ...changes });
        await updateRow(db, 'restaurants', RESTAURANT_COLUMNS, id, changes);
        return getRestaurant(id, db);
      });
    },

    async deleteRestaurant(id) {
      await transaction(pool, async (db) => {
        if (!(await getRestaurant(id, db))) throw ApiError.notFound('Restaurant');
        const n = await count(db, 'SELECT COUNT(*)::int AS n FROM food_items WHERE restaurant_id = $1', [id]);
        if (n > 0) throw ApiError.inUse(`Restaurant still has ${n} food item(s); delete or move them first`);
        await db.query("DELETE FROM favorites WHERE kind = 'restaurant' AND target_id = $1", [id]);
        await db.query('DELETE FROM restaurants WHERE id = $1', [id]);
      });
    },

    getCategory,

    /** New categories go to the end of the list unless `sortOrder` is given. */
    async createCategory(data) {
      const value = { ...CATEGORY_DEFAULTS, ...data };
      return transaction(pool, async (db) => {
        const id = await claimId(db, data.id, 'cat', 'categories');
        value.sortOrder ??= await count(db, 'SELECT (COALESCE(MAX(sort_order), 0) + 1)::int AS n FROM categories');
        await insertRow(db, 'categories', CATEGORY_COLUMNS, id, value);
        return getCategory(id, db);
      });
    },

    async updateCategory(id, changes) {
      if (id === ALL_CATEGORY_ID) throw builtIn();
      return transaction(pool, async (db) => {
        if (!(await getCategory(id, db))) throw ApiError.notFound('Category');
        await updateRow(db, 'categories', CATEGORY_COLUMNS, id, changes);
        return getCategory(id, db);
      });
    },

    async deleteCategory(id) {
      if (id === ALL_CATEGORY_ID) throw builtIn();
      await transaction(pool, async (db) => {
        if (!(await getCategory(id, db))) throw ApiError.notFound('Category');
        const n = await count(db, 'SELECT COUNT(*)::int AS n FROM food_items WHERE category_id = $1', [id]);
        if (n > 0) throw ApiError.inUse(`Category is still used by ${n} food item(s); move them first`);
        await db.query('DELETE FROM categories WHERE id = $1', [id]);
      });
    },

    /** All items, including unavailable ones. `search` matches name, description or id. */
    async adminListFoodItems({ restaurantId, categoryId, search } = {}) {
      const where = ['TRUE'];
      const args = [];
      if (restaurantId) { args.push(restaurantId); where.push(`restaurant_id = $${args.length}`); }
      if (categoryId && categoryId !== ALL_CATEGORY_ID) { args.push(categoryId); where.push(`category_id = $${args.length}`); }
      const q = search?.trim();
      if (q) {
        args.push(likeArg(q));
        const n = `$${args.length}`;
        where.push(`(name ILIKE ${n} ESCAPE '\\' OR description ILIKE ${n} ESCAPE '\\' OR id ILIKE ${n} ESCAPE '\\')`);
      }
      const rows = await many(pool,
        `SELECT * FROM food_items WHERE ${where.join(' AND ')} ORDER BY lower(name), id`, args);
      return rows.map(foodItemFromRow);
    },

    async createFoodItem(data) {
      const value = { ...FOOD_DEFAULTS, ...data };
      return transaction(pool, async (db) => {
        await checkFoodRefs(db, value);
        value.customizationGroups = normalizeGroups(value.customizationGroups);
        const id = await claimId(db, data.id, 'food', 'food_items');
        await insertRow(db, 'food_items', FOOD_COLUMNS, id, value);
        return getFoodItem(id, db);
      });
    },

    async updateFoodItem(id, changes) {
      return transaction(pool, async (db) => {
        const current = await getFoodItem(id, db);
        if (!current) throw ApiError.notFound('Food item');
        await checkFoodRefs(db, { ...current, ...changes });
        const patch = { ...changes };
        if (patch.customizationGroups) patch.customizationGroups = normalizeGroups(patch.customizationGroups);
        await updateRow(db, 'food_items', FOOD_COLUMNS, id, patch);
        return getFoodItem(id, db);
      });
    },

    async deleteFoodItem(id) {
      await transaction(pool, async (db) => {
        if (!(await getFoodItem(id, db))) throw ApiError.notFound('Food item');
        await db.query("DELETE FROM favorites WHERE kind = 'food' AND target_id = $1", [id]);
        await db.query('DELETE FROM food_items WHERE id = $1', [id]);
      });
    },
  };
}
