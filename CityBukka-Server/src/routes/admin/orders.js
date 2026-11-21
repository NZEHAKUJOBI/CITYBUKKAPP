import { Router } from 'express';
import { z } from 'zod';
import { ORDER_STATUS } from '../../config.js';
import { ApiError, validate } from '../../lib/errors.js';

const STATUS_CODES = new Set(Object.values(ORDER_STATUS));

/** `status` may be a name (`preparing`) or its integer code (`1`). */
const statusParam = z.string().trim().transform((v, ctx) => {
  if (Object.hasOwn(ORDER_STATUS, v)) return ORDER_STATUS[v];
  if (/^\d+$/.test(v) && STATUS_CODES.has(Number(v))) return Number(v);
  ctx.addIssue({ code: 'custom', message: `Unknown status; use one of ${Object.keys(ORDER_STATUS).join(', ')} or 0-5` });
  return z.NEVER;
});

const orderQuery = z.object({
  status: statusParam.optional(),
  q: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const usersQuery = z.object({ role: z.enum(['customer', 'rider']).optional() });
const assignBody = z.object({ riderId: z.string().trim().min(1).max(100) });

export function adminOrderRoutes({ catalog, orders, users }) {
  const r = Router();

  r.get('/stats', async (req, res) => {
    const [{ ordersByStatus, recentOrders, ...orderStats }, counts, customers, riders] = await Promise.all([
      orders.stats(), catalog.counts(), users.count(), users.countActiveRiders(),
    ]);
    res.json({ ...orderStats, ...counts, users: customers, riders, ordersByStatus, recentOrders });
  });

  r.get('/orders', async (req, res) => {
    const { status, q, limit, offset } = validate(orderQuery, req.query);
    res.json(await orders.adminList({ status, q, limit, offset }));
  });

  const found = async (id) => {
    const order = await orders.adminGet(id);
    if (!order) throw ApiError.notFound('Order');
    return order;
  };

  r.get('/orders/:id', async (req, res) => {
    res.json(await found(req.params.id));
  });

  r.post('/orders/:id/advance', async (req, res) => {
    await orders.advance(req.params.id);
    res.json(await found(req.params.id));
  });

  r.post('/orders/:id/assign', async (req, res) => {
    const { riderId } = validate(assignBody, req.body ?? {});
    await orders.assign(req.params.id, riderId);
    res.json(await found(req.params.id));
  });

  r.post('/orders/:id/unassign', async (req, res) => {
    await orders.unassign(req.params.id);
    res.json(await found(req.params.id));
  });

  r.post('/orders/:id/cancel', async (req, res) => {
    await orders.cancel(req.params.id, { asStaff: true });
    res.json(await found(req.params.id));
  });

  r.get('/users', async (req, res) => {
    const { role } = validate(usersQuery, req.query);
    res.json(await users.listWithOrderCount({ role }));
  });

  return r;
}
