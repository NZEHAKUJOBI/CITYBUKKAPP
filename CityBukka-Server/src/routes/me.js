import { Router } from 'express';
import { z } from 'zod';
import { ApiError, validate } from '../lib/errors.js';
import { publicUser } from '../repositories/users.js';
import { isImageUrl } from './admin/catalog.js';

/** Phone is the login identifier and can't be changed here. */
const profilePatch = z.strictObject({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.union([z.email().max(200), z.literal(''), z.null()]).optional(),
  avatarUrl: z.string().trim().max(500).refine(isImageUrl, 'Must be an https:// URL, an /uploads/... path or ""').optional(),
  savedAddresses: z.array(z.string().trim().min(3).max(200)).max(10).optional(),
  selectedAddress: z.union([z.string().trim().min(3).max(200), z.literal('')]).optional(),
  isDarkMode: z.boolean().optional(),
});

const KINDS = { food: 'food', foods: 'food', restaurant: 'restaurant', restaurants: 'restaurant' };

export function meRoutes({ users, catalog }) {
  const r = Router();

  r.get('/', async (req, res) => {
    res.json(publicUser(await users.get(req.userId)));
  });

  r.patch('/', async (req, res) => {
    const changes = validate(profilePatch, req.body ?? {});
    if (changes.email !== undefined) changes.email = changes.email ? changes.email.toLowerCase() : null;
    const current = await users.get(req.userId);
    const addresses = changes.savedAddresses ?? current.savedAddresses;
    const selected = changes.selectedAddress ?? current.selectedAddress;
    if (selected && !addresses.includes(selected)) {
      throw ApiError.badRequest('selectedAddress must be one of savedAddresses');
    }
    res.json(publicUser(await users.update(req.userId, changes)));
  });

  r.get('/favorites', async (req, res) => {
    const [foodItems, restaurants] = await Promise.all([
      users.favoriteFoodItems(req.userId),
      users.favoriteRestaurants(req.userId),
    ]);
    res.json({ foodItems: foodItems.map(({ isAvailable, ...f }) => f), restaurants });
  });

  r.get('/favorites/ids', async (req, res) => {
    res.json(await users.favoriteIds(req.userId));
  });

  // PUT adds, DELETE removes – both idempotent, so retries on flaky networks are safe.
  r.put('/favorites/:kind/:id', async (req, res) => {
    const kind = KINDS[req.params.kind];
    if (!kind) throw ApiError.notFound('Favorite type');
    const exists = kind === 'food' ? await catalog.getFoodItem(req.params.id) : await catalog.getRestaurant(req.params.id);
    if (!exists) throw ApiError.notFound(kind === 'food' ? 'Food item' : 'Restaurant');
    await users.addFavorite(req.userId, kind, req.params.id);
    res.status(204).end();
  });

  r.delete('/favorites/:kind/:id', async (req, res) => {
    const kind = KINDS[req.params.kind];
    if (!kind) throw ApiError.notFound('Favorite type');
    await users.removeFavorite(req.userId, kind, req.params.id);
    res.status(204).end();
  });

  return r;
}
