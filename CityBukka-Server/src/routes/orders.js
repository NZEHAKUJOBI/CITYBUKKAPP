import { Router } from 'express';
import { z } from 'zod';
import { PAYMENT_METHODS } from '../config.js';
import { requirePhone } from '../lib/auth.js';
import { ApiError, validate } from '../lib/errors.js';
import { buildCartItems, priceCart } from '../lib/pricing.js';

const cartLine = z.object({
  foodItemId: z.string().min(1).max(100),
  quantity: z.int().min(1).max(50),
  optionIds: z.array(z.string().max(100)).max(20).optional(),
  specialInstructions: z.string().trim().max(300).optional(),
});

const quoteBody = z.object({
  items: z.array(cartLine).min(1).max(30),
  promoCode: z.string().trim().max(30).optional(),
});

const orderBody = quoteBody.extend({
  deliveryAddress: z.string().trim().min(3).max(200),
  /** Phone the rider should call; defaults to the account's phone. */
  contactPhone: z.string().trim().max(30).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
});

const listQuery = z.object({ status: z.enum(['active', 'past']).optional() });

/** Load everything a cart references in two queries, then price it with the pure pricing helpers. */
export async function quoteCart(catalog, body) {
  const foods = await catalog.foodItemsByIds(body.items.map((l) => l.foodItemId));
  const restaurants = await catalog.restaurantsByIds([...foods.values()].map((f) => f.restaurantId));
  const items = buildCartItems(body.items, (id) => foods.get(id) ?? null, (id) => restaurants.get(id) ?? null);
  return { items, restaurants, pricing: priceCart(items, body.promoCode || null) };
}

export function orderRoutes({ catalog, orders }) {
  /** Price a cart (and validate a promo code) without placing an order. Public. */
  const cart = Router();
  cart.post('/quote', async (req, res) => {
    const { items, pricing } = await quoteCart(catalog, validate(quoteBody, req.body ?? {}));
    res.json({ items, ...pricing });
  });

  const r = Router();

  r.get('/', async (req, res) => {
    const { status } = validate(listQuery, req.query);
    const active = status === 'active' ? true : status === 'past' ? false : undefined;
    res.json(await orders.listForUser(req.userId, { active }));
  });

  r.get('/:id', async (req, res) => {
    const order = await orders.get(req.params.id, req.userId);
    if (!order) throw ApiError.notFound('Order');
    res.json(order);
  });

  /** Totals are always computed here – anything price-related the client sends is ignored. */
  r.post('/', async (req, res) => {
    const body = validate(orderBody, req.body ?? {});
    const contactPhone = body.contactPhone ? requirePhone(body.contactPhone, 'contactPhone') : req.user.phone;
    const { items, pricing, restaurants } = await quoteCart(catalog, body);

    const prep = Math.max(...items.map((i) => i.foodItem.prepTimeMinutes));
    const used = new Set(items.map((i) => i.foodItem.restaurantId));
    const travel = Math.max(...[...used].map((id) => restaurants.get(id).deliveryTimeMin));

    const order = await orders.create({
      userId: req.userId,
      items,
      pricing,
      deliveryAddress: body.deliveryAddress,
      contactPhone,
      paymentMethod: body.paymentMethod,
      estimatedDeliveryMinutes: prep + travel,
    });
    res.status(201).location(`${req.baseUrl}/${order.id}`).json(order);
  });

  r.post('/:id/cancel', async (req, res) => {
    res.json(await orders.cancel(req.params.id, { userId: req.userId }));
  });

  return { cartRouter: cart, ordersRouter: r };
}
