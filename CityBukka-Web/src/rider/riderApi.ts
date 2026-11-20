import { apiUrl } from '../config/env';
import type { DeliveryScope, RiderMe, RiderOrder, RiderSession } from './types';

const SESSION_KEY = 'citybukka:rider-session';

// ---------------------------------------------------------------------------
// Session (localStorage – riders stay signed in between app launches)
// ---------------------------------------------------------------------------

export function loadRiderSession(): RiderSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as RiderSession;
    if (!session?.token) return null;
    if (session.expiresAt && Date.parse(session.expiresAt) <= Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveRiderSession(session: RiderSession | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage blocked – the session lives only in memory for this page.
  }
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class RiderApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfter?: number;
  constructor(status: number, code: string, message: string, retryAfter?: number) {
    super(message);
    this.name = 'RiderApiError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export const NOT_RIDER_MESSAGE = "This account isn't a rider account";
export const DISABLED_MESSAGE = 'Your rider account is disabled, contact admin';

export function riderErrorMessage(err: unknown): string {
  if (err instanceof RiderApiError) {
    switch (err.code) {
      case 'invalid_credentials': return 'Wrong phone number or password.';
      case 'account_disabled': return DISABLED_MESSAGE;
      case 'not_rider': return NOT_RIDER_MESSAGE;
      case 'rate_limited': {
        const wait = err.retryAfter
          ? ` Try again in ${err.retryAfter < 90 ? `${err.retryAfter} s` : `${Math.ceil(err.retryAfter / 60)} min`}.`
          : ' Try again later.';
        return `Too many attempts.${wait}`;
      }
      case 'invalid_status':
        return err.message && !/^Request failed/.test(err.message)
          ? err.message
          : 'This order has already moved on. Refresh to see its latest status.';
      case 'not_found': return 'This order is no longer assigned to you.';
      default: return err.message;
    }
  }
  if (err instanceof TypeError) return 'Could not reach the server. Check your connection.';
  return err instanceof Error ? err.message : 'Something went wrong';
}

export type SessionEndReason = 'expired' | 'disabled';
type EndListener = (reason: SessionEndReason) => void;
let endListener: EndListener | null = null;

/** The auth provider registers this so a 401 / disabled account signs the rider out. */
export function onRiderSessionEnd(listener: EndListener | null) {
  endListener = listener;
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

async function parseError(res: Response): Promise<RiderApiError> {
  let code = res.status === 429 ? 'rate_limited' : 'http_error';
  let message = `Request failed (${res.status})`;
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
    }
  } catch {
    // non-JSON error body
  }
  const retry = Number(res.headers.get('Retry-After'));
  return new RiderApiError(res.status, code, message, Number.isFinite(retry) && retry > 0 ? retry : undefined);
}

async function request<T>(path: string, { method = 'GET', body, query, anonymous }:
  { method?: string; body?: unknown; query?: Record<string, string | undefined>; anonymous?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (!anonymous) {
    const token = loadRiderSession()?.token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(apiUrl(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await parseError(res);
    if (!anonymous && (res.status === 401 || err.code === 'account_disabled')) {
      saveRiderSession(null);
      endListener?.(err.code === 'account_disabled' ? 'disabled' : 'expired');
    }
    throw err;
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const id = (value: string) => encodeURIComponent(value);

export const riderApi = {
  /** Shared phone login. Rejects (without storing anything) when the account is not a rider. */
  async login(phone: string, password: string): Promise<RiderSession> {
    const result = await request<RiderSession>('/api/auth/login', {
      method: 'POST', body: { phone, password }, anonymous: true,
    });
    if (result?.user?.role !== 'rider') throw new RiderApiError(403, 'not_rider', NOT_RIDER_MESSAGE);
    return result;
  },
  me: () => request<RiderMe>('/api/rider/me'),
  orders: (scope: DeliveryScope) => request<RiderOrder[]>('/api/rider/orders', { query: { scope } }),
  order: (oid: string) => request<RiderOrder>(`/api/rider/orders/${id(oid)}`),
  pickup: (oid: string) => request<RiderOrder>(`/api/rider/orders/${id(oid)}/pickup`, { method: 'POST' }),
  deliver: (oid: string) => request<RiderOrder>(`/api/rider/orders/${id(oid)}/deliver`, { method: 'POST' }),
};
