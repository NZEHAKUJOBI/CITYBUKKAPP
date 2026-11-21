import { Router } from 'express';
import { z } from 'zod';
import { hashPassword, requirePhone } from '../../lib/auth.js';
import { ApiError, validate } from '../../lib/errors.js';

const email = z.union([z.email().max(200), z.literal(''), z.null()]);

const createBody = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(30),
  password: z.string().min(6).max(200),
  vehicle: z.string().trim().min(1).max(120),
  plateNumber: z.string().trim().max(30).nullable().optional(),
  email: email.optional(),
});

const patchBody = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().min(1).max(30).optional(),
  password: z.string().min(6).max(200).optional(),
  vehicle: z.string().trim().min(1).max(120).optional(),
  plateNumber: z.string().trim().max(30).nullable().optional(),
  email: email.optional(),
  isActive: z.boolean().optional(),
});

const blankToNull = (v) => (v === undefined ? undefined : v || null);

/** Rider accounts: users with role 'rider'. Riders log in through POST /api/auth/login. */
export function adminRiderRoutes({ users }) {
  const r = Router();

  r.get('/riders', async (req, res) => {
    res.json(await users.listRiders());
  });

  r.get('/riders/:id', async (req, res) => {
    const rider = await users.getRider(req.params.id);
    if (!rider) throw ApiError.notFound('Rider');
    res.json(rider);
  });

  r.post('/riders', async (req, res) => {
    const body = validate(createBody, req.body ?? {});
    const rider = await users.createRider({
      name: body.name,
      phone: requirePhone(body.phone),
      email: blankToNull(body.email)?.toLowerCase() ?? null,
      passwordHash: await hashPassword(body.password),
      vehicle: body.vehicle,
      plateNumber: blankToNull(body.plateNumber) ?? null,
    });
    res.status(201).location(`${req.baseUrl}/riders/${rider.id}`).json(rider);
  });

  r.patch('/riders/:id', async (req, res) => {
    const body = validate(patchBody, req.body ?? {});
    res.json(await users.updateRider(req.params.id, {
      name: body.name,
      phone: body.phone === undefined ? undefined : requirePhone(body.phone),
      email: blankToNull(body.email)?.toLowerCase() ?? blankToNull(body.email),
      vehicle: body.vehicle,
      plateNumber: blankToNull(body.plateNumber),
      isActive: body.isActive,
      passwordHash: body.password === undefined ? undefined : await hashPassword(body.password),
    }));
  });

  /** Deactivates (soft delete) so past orders keep their rider; 409 in_use while they have active orders. */
  r.delete('/riders/:id', async (req, res) => {
    await users.deactivateRider(req.params.id);
    res.status(204).end();
  });

  return r;
}
