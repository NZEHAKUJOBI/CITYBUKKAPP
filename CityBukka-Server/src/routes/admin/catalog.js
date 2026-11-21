import { Router } from 'express';
import { z } from 'zod';
import { ApiError, validate } from '../../lib/errors.js';

/** Image fields take an absolute https URL, a `/uploads/<file>` path from POST /api/admin/uploads, or ''. */
export const isImageUrl = (v) => {
  if (v === '' || /^\/uploads\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(v)) return true;
  return URL.canParse(v) && new URL(v).protocol === 'https:';
};
const imageUrl = z.string().trim().max(500)
  .refine(isImageUrl, 'Must be an https:// URL or an /uploads/... path');

const id = z.string().trim().regex(/^[A-Za-z0-9_-]{1,64}$/, 'Use 1-64 letters, digits, _ or -');
const ref = z.string().trim().min(1).max(100);
const text = (max) => z.string().trim().max(max);
const name = (max) => z.string().trim().min(1).max(max);
const tags = z.array(z.string().trim().min(1).max(60)).max(20);

/** Every field optional – used for PATCH and as the base for POST. Unknown keys are dropped. */
const optional = (shape) => Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, v.optional()]));

const restaurantFields = {
  name: name(100),
  tagline: text(200),
  description: text(2000),
  coverImageUrl: imageUrl,
  logoUrl: imageUrl,
  rating: z.number().min(0).max(5),
  reviewCount: z.int().min(0),
  deliveryTimeMin: z.int().min(0).max(600),
  deliveryTimeMax: z.int().min(0).max(600),
  deliveryFee: z.number().min(0).max(1_000_000),
  distanceKm: z.number().min(0).max(1000),
  cuisines: tags,
  isFeatured: z.boolean(),
  isOpen: z.boolean(),
  address: text(300),
  badges: tags,
};

const categoryFields = {
  name: name(60),
  iconEmoji: z.string().trim().min(1).max(16),
  description: text(300),
  sortOrder: z.int().min(0).max(100_000),
};

const option = z.object({
  id: id.optional(),
  name: name(100),
  extraPrice: z.number().min(0).max(1_000_000).default(0),
});

const group = z.object({
  id: id.optional(),
  name: name(100),
  isRequired: z.boolean().default(false),
  maxSelectable: z.int().min(1).max(50).default(1),
  options: z.array(option).min(1).max(50),
});

const foodFields = {
  restaurantId: ref,
  categoryId: ref,
  name: name(120),
  description: text(2000),
  price: z.number().min(0).max(10_000_000),
  imageUrl,
  spiceLevel: z.int().min(0).max(4),
  rating: z.number().min(0).max(5),
  reviewCount: z.int().min(0),
  calories: z.int().min(0).max(20_000),
  prepTimeMinutes: z.int().min(0).max(600),
  isPopular: z.boolean(),
  isChefSpecial: z.boolean(),
  isVegetarian: z.boolean(),
  isAvailable: z.boolean(),
  customizationGroups: z.array(group).max(20),
};

const schemas = {
  restaurant: {
    create: z.object({ ...optional(restaurantFields), id: id.optional(), name: restaurantFields.name }),
    patch: z.object(optional(restaurantFields)),
  },
  category: {
    create: z.object({ ...optional(categoryFields), id: id.optional(), name: categoryFields.name }),
    patch: z.object(optional(categoryFields)),
  },
  food: {
    create: z.object({
      ...optional(foodFields),
      id: id.optional(),
      restaurantId: ref,
      categoryId: ref,
      name: foodFields.name,
      price: foodFields.price,
    }),
    patch: z.object(optional(foodFields)),
  },
};

const foodQuery = z.object({
  restaurantId: z.string().max(100).optional(),
  categoryId: z.string().max(100).optional(),
  q: z.string().max(100).optional(),
});

export function adminCatalogRoutes({ catalog }) {
  const r = Router();
  const created = (req, res, entity) =>
    res.status(201).location(`${req.baseUrl}${req.path}/${entity.id}`).json(entity);

  // Restaurants (open and closed)
  r.get('/restaurants', async (req, res) => {
    res.json(await catalog.listRestaurants());
  });
  r.post('/restaurants', async (req, res) => {
    created(req, res, await catalog.createRestaurant(validate(schemas.restaurant.create, req.body ?? {})));
  });
  r.get('/restaurants/:id', async (req, res) => {
    const restaurant = await catalog.getRestaurant(req.params.id);
    if (!restaurant) throw ApiError.notFound('Restaurant');
    res.json(restaurant);
  });
  r.patch('/restaurants/:id', async (req, res) => {
    res.json(await catalog.updateRestaurant(req.params.id, validate(schemas.restaurant.patch, req.body ?? {})));
  });
  r.delete('/restaurants/:id', async (req, res) => {
    await catalog.deleteRestaurant(req.params.id);
    res.status(204).end();
  });

  // Categories
  r.get('/categories', async (req, res) => {
    res.json(await catalog.listCategories());
  });
  r.post('/categories', async (req, res) => {
    created(req, res, await catalog.createCategory(validate(schemas.category.create, req.body ?? {})));
  });
  r.get('/categories/:id', async (req, res) => {
    const category = await catalog.getCategory(req.params.id);
    if (!category) throw ApiError.notFound('Category');
    res.json(category);
  });
  r.patch('/categories/:id', async (req, res) => {
    res.json(await catalog.updateCategory(req.params.id, validate(schemas.category.patch, req.body ?? {})));
  });
  r.delete('/categories/:id', async (req, res) => {
    await catalog.deleteCategory(req.params.id);
    res.status(204).end();
  });

  // Food items (available and unavailable)
  r.get('/food-items', async (req, res) => {
    const { restaurantId, categoryId, q } = validate(foodQuery, req.query);
    res.json(await catalog.adminListFoodItems({ restaurantId, categoryId, search: q }));
  });
  r.post('/food-items', async (req, res) => {
    created(req, res, await catalog.createFoodItem(validate(schemas.food.create, req.body ?? {})));
  });
  r.get('/food-items/:id', async (req, res) => {
    const food = await catalog.getFoodItem(req.params.id);
    if (!food) throw ApiError.notFound('Food item');
    res.json(food);
  });
  r.patch('/food-items/:id', async (req, res) => {
    res.json(await catalog.updateFoodItem(req.params.id, validate(schemas.food.patch, req.body ?? {})));
  });
  r.delete('/food-items/:id', async (req, res) => {
    await catalog.deleteFoodItem(req.params.id);
    res.status(204).end();
  });

  return r;
}
