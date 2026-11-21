import { Router } from 'express';
import { z } from 'zod';
import { ApiError, validate } from '../lib/errors.js';

const restaurantQuery = z.object({
  q: z.string().max(100).optional(),
  cuisine: z.string().max(100).optional(),
});

const foodQuery = z.object({
  categoryId: z.string().max(100).optional(),
  restaurantId: z.string().max(100).optional(),
  q: z.string().max(100).optional(),
  popular: z.enum(['true', 'false']).optional(),
});

/** Hide internal fields from public catalogue responses. */
const publicFood = ({ isAvailable, ...food }) => food;

export function catalogRoutes({ catalog }) {
  const r = Router();

  r.get('/categories', async (req, res) => {
    res.json(await catalog.listCategories());
  });

  r.get('/restaurants', async (req, res) => {
    const { q, cuisine } = validate(restaurantQuery, req.query);
    res.json(await catalog.listRestaurants({ query: q, cuisine }));
  });

  r.get('/restaurants/:id', async (req, res) => {
    const restaurant = await catalog.getRestaurant(req.params.id);
    if (!restaurant) throw ApiError.notFound('Restaurant');
    res.json(restaurant);
  });

  r.get('/restaurants/:id/menu', async (req, res) => {
    if (!(await catalog.getRestaurant(req.params.id))) throw ApiError.notFound('Restaurant');
    res.json((await catalog.listFoodItems({ restaurantId: req.params.id })).map(publicFood));
  });

  r.get('/food-items', async (req, res) => {
    const { categoryId, restaurantId, q, popular } = validate(foodQuery, req.query);
    const items = await catalog.listFoodItems({ categoryId, restaurantId, search: q, popularOnly: popular === 'true' });
    res.json(items.map(publicFood));
  });

  r.get('/food-items/:id', async (req, res) => {
    const food = await catalog.getFoodItem(req.params.id);
    if (!food || !food.isAvailable) throw ApiError.notFound('Food item');
    res.json(publicFood(food));
  });

  return r;
}
