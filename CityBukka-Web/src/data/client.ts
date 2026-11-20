import { apiUrl } from '../config/env';
import type { UserProfile } from '../types';

// ---------------------------------------------------------------------------
// Customer session (phone + password sign-in). Kept in localStorage so
// customers stay signed in until the 30-day token expires.
// ---------------------------------------------------------------------------

export interface CustomerSession {
  token: string;
  /** ISO-8601; the session is dropped once this passes. */
  expiresAt: string | null;
  user: UserProfile;
}

const SESSION_KEY = 'citybukka:session';

export function loadSession(): CustomerSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as CustomerSession;
    if (!session?.token || !session.user) return null;
    if (session.expiresAt && Date.parse(session.expiresAt) <= Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: CustomerSession | null) {
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

/** Error body shape used by CityBukka-Server: { error: { code, message, details? } }. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  /** Seconds, from the Retry-After header (429 rate_limited). */
  readonly retryAfter?: number;
  constructor(status: number, code: string, message: string, details?: unknown, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

const FRIENDLY: Record<string, string> = {
  invalid_credentials: 'Wrong phone number or password.',
  account_disabled: 'This account has been disabled. Please contact support.',
  phone_taken: 'An account with this phone number already exists. Try signing in.',
  invalid_phone: 'Enter a valid Nigerian phone number, e.g. 0803 123 4567.',
};

/** Human-readable message for anything thrown by the API helpers. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof ApiError) {
    if (err.code === 'rate_limited' || err.status === 429) {
      const s = err.retryAfter;
      const wait = s ? ` Try again in ${s < 90 ? `${s} seconds` : `${Math.ceil(s / 60)} minutes`}.` : ' Try again later.';
      return `Too many attempts.${wait}`;
    }
    const friendly = FRIENDLY[err.code];
    if (friendly) return friendly;
    if (Array.isArray(err.details) && err.details.length > 0) {
      const first = err.details[0] as { path?: string; message?: string };
      if (first?.message) return first.path ? `${first.path}: ${first.message}` : first.message;
    }
    if (err.status >= 500) return 'The server had a problem. Please try again shortly.';
    return err.message || fallback;
  }
  if (err instanceof TypeError || (err instanceof DOMException && err.name === 'AbortError')) {
    return "Couldn't reach CityBukka. Check your connection and try again.";
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Request helper
// ---------------------------------------------------------------------------

type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;

/** The auth provider registers this so a 401 on any signed-in request ends the session. */
export function onUnauthorized(listener: UnauthorizedListener | null) {
  unauthorizedListener = listener;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Send the stored Bearer token (default true). */
  auth?: boolean;
  params?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
}

/**
 * JSON request against CityBukka-Server. Throws ApiError for non-2xx responses;
 * returns undefined for 204. A 401 on an authenticated request clears the session.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, params, timeoutMs = 15000 } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? loadSession()?.token : undefined;
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  let res: Response;
  try {
    res = await fetch(apiUrl(path, params), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller?.signal,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null) as unknown;
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    const retry = Number(res.headers.get('Retry-After'));
    const err = new ApiError(
      res.status,
      e?.code ?? (res.status === 401 ? 'unauthorized' : 'http_error'),
      e?.message ?? `Request failed (${res.status})`,
      e?.details,
      Number.isFinite(retry) && retry > 0 ? retry : undefined,
    );
    if (res.status === 401 && token) {
      saveSession(null);
      unauthorizedListener?.();
    }
    throw err;
  }
  return data as T;
}
