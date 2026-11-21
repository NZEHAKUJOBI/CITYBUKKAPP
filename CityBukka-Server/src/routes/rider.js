import { Router } from 'express';
import { z } from 'zod';
import { ORDER_STATUS } from '../config.js';
import { ApiError, validate } from '../lib/errors.js';
import { publicUser } from '../repositories/users.js';

const listQuery = z.object({ scope: z.enum(['active', 'completed']).default('active') });

/** Rider app API; mounted behind requireUser(..., 'rider'), so req.userId is the rider. */
export function riderRoutes({ users, orders }) {
  const r = Router();

  r.get('/me', async (req, res) => {
    res.json({ user: publicUser(req.user), rider: await users.riderProfile(req.userId) });
  });

  r.get('/orders', async (req, res) => {
    const { scope } = validate(listQuery, req.query);
    res.json(await orders.listForRider(req.userId, { scope }));
  });

  r.get('/orders/:id', async (req, res) => {
    const order = await orders.getForRider(req.params.id, req.userId);
    if (!order) throw ApiError.notFound('Order');
    res.json(order);
  });

  r.post('/orders/:id/pickup', async (req, res) => {
    res.json(await orders.riderTransition(req.params.id, req.userId, ORDER_STATUS.riderAssigned, ORDER_STATUS.outForDelivery));
  });

  r.post('/orders/:id/deliver', async (req, res) => {
    res.json(await orders.riderTransition(req.params.id, req.userId, ORDER_STATUS.outForDelivery, ORDER_STATUS.delivered));
  });

  return r;
}
