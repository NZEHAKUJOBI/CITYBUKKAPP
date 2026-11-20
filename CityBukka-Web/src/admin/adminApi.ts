import { API_BASE_URL, apiUrl } from '../config/env';
import type {
  AdminCategory, AdminFoodItem, AdminOrder, AdminRestaurant, AdminRider, AdminSession, AdminStats, AdminUser, Paged,
  RiderInput, RiderPatch, UserRole,
} from './types';

const SESSION_KEY = 'citybukka:admin-session';

// ---------------------------------------------------------------------------
// Session storage (per tab; cleared when the browser tab closes)
// ---------------------------------------------------------------------------

export function loadSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AdminSession;
    if (!session?.token) return null;
    if (session.expiresAt && Date.parse(session.expiresAt) <= Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: AdminSession | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage blocked – the session lives only in memory for this page.
  }
}

// ---------------------------------------------------------------------------
// Errors + 401 handling
// ---------------------------------------------------------------------------

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  /** Seconds, from the Retry-After header (429 rate_limited). */
  readonly retryAfter?: number;
  constructor(status: number, code: string, message: string, details?: unknown, retryAfter?: number) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

const FRIENDLY: Record<string, string> = {
  invalid_credentials: 'Wrong email or password.',
  admin_login_disabled: 'Admin sign-in is disabled on the server.',
  unsupported_media_type: 'Only JPEG, PNG or WebP images are allowed.',
  file_too_large: 'Image must be 5 MB or smaller.',
  invalid_phone: 'Enter a valid Nigerian phone number, e.g. 0803 123 4567.',
  phone_taken: 'That phone number is already used by another account.',
  rider_required: 'Assign a rider to this order before moving it on.',
};

type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;

/** The auth provider registers this so any 401 logs the admin out. */
export function onUnauthorized(listener: UnauthorizedListener | null) {
  unauthorizedListener = listener;
}

/** Human-readable message for any error thrown by the admin API. */
export function errorMessage(err: unknown): string {
  if (err instanceof AdminApiError) {
    if (err.code === 'in_use') return err.message || 'This item is still in use and cannot be deleted.';
    if (err.code === 'rate_limited' || err.status === 429) {
      const wait = err.retryAfter ? ` Try again in ${err.retryAfter < 90 ? `${err.retryAfter} s` : `${Math.ceil(err.retryAfter / 60)} min`}.` : ' Try again later.';
      return `Too many attempts.${wait}`;
    }
    const friendly = FRIENDLY[err.code];
    if (friendly) return friendly;
    if (err.code === 'conflict' && err.message) return err.message;
    if (Array.isArray(err.details) && err.details.length) {
      const first = err.details[0] as { path?: string; message?: string };
      return `${err.message}: ${first.path ? `${first.path} – ` : ''}${first.message ?? ''}`;
    }
    return err.message;
  }
  if (err instanceof TypeError) return 'Could not reach the server. Check your connection.';
  return err instanceof Error ? err.message : 'Something went wrong';
}

async function parseError(res: Response): Promise<AdminApiError> {
  let code = 'http_error';
  let message = `Request failed (${res.status})`;
  let details: unknown;
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string; details?: unknown } };
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      details = body.error.details;
    }
  } catch {
    // non-JSON error body
  }
  const retry = Number(res.headers.get('Retry-After'));
  return new AdminApiError(res.status, code, message, details, Number.isFinite(retry) && retry > 0 ? retry : undefined);
}

type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Query;
  /** Skip auth header + 401 auto-logout (login). */
  anonymous?: boolean;
}

export async function request<T>(path: string, { method = 'GET', body, query, anonymous }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (!anonymous) {
    const token = loadSession()?.token;
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
    if (res.status === 401 && !anonymous) {
      saveSession(null);
      unauthorizedListener?.();
    }
    throw err;
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ---------------------------------------------------------------------------
// Uploads (XHR so we can report progress)
// ---------------------------------------------------------------------------

export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

/** Client-side check before uploading. Returns an error message or null. */
export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!UPLOAD_TYPES.includes(file.type)) return 'Only JPEG, PNG or WebP images are allowed.';
  if (file.size > UPLOAD_MAX_BYTES) return 'Image must be 5 MB or smaller.';
  return null;
}

export function uploadImage(file: File, onProgress?: (fraction: number) => void): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl('/api/admin/uploads'));
    const token = loadSession()?.token;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new TypeError('Network error while uploading'));
    xhr.onload = () => {
      let body: { url?: string; error?: { code?: string; message?: string; details?: unknown } } = {};
      try {
        body = JSON.parse(xhr.responseText || '{}');
      } catch {
        // ignore
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.url) {
        onProgress?.(1);
        resolve({ url: body.url });
        return;
      }
      if (xhr.status === 401) {
        saveSession(null);
        unauthorizedListener?.();
      }
      reject(new AdminApiError(xhr.status, body.error?.code ?? 'upload_failed',
        body.error?.message ?? `Upload failed (${xhr.status})`, body.error?.details));
    };
    const form = new FormData();
    form.append('image', file);
    xhr.send(form);
  });
}

/** `/uploads/...` paths need the API origin when the API is hosted elsewhere. */
export { resolveMediaUrl } from '../config/env';
export const apiBase = API_BASE_URL;

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const id = (value: string) => encodeURIComponent(value);

export const adminApi = {
  login: (email: string, password: string) =>
    request<AdminSession>('/api/admin/login', { method: 'POST', body: { email, password }, anonymous: true }),
  me: () => request<{ email: string; name: string }>('/api/admin/me'),
  stats: () => request<AdminStats>('/api/admin/stats'),

  restaurants: {
    list: (q?: string) => request<AdminRestaurant[]>('/api/admin/restaurants', { query: { q } }),
    get: (rid: string) => request<AdminRestaurant>(`/api/admin/restaurants/${id(rid)}`),
    create: (data: Partial<AdminRestaurant>) => request<AdminRestaurant>('/api/admin/restaurants', { method: 'POST', body: data }),
    update: (rid: string, data: Partial<AdminRestaurant>) =>
      request<AdminRestaurant>(`/api/admin/restaurants/${id(rid)}`, { method: 'PATCH', body: data }),
    remove: (rid: string) => request<void>(`/api/admin/restaurants/${id(rid)}`, { method: 'DELETE' }),
  },

  categories: {
    list: () => request<AdminCategory[]>('/api/admin/categories'),
    create: (data: Partial<AdminCategory>) => request<AdminCategory>('/api/admin/categories', { method: 'POST', body: data }),
    update: (cid: string, data: Partial<AdminCategory>) =>
      request<AdminCategory>(`/api/admin/categories/${id(cid)}`, { method: 'PATCH', body: data }),
    remove: (cid: string) => request<void>(`/api/admin/categories/${id(cid)}`, { method: 'DELETE' }),
  },

  foodItems: {
    list: (filter: { restaurantId?: string; categoryId?: string; q?: string } = {}) =>
      request<AdminFoodItem[]>('/api/admin/food-items', { query: filter }),
    get: (fid: string) => request<AdminFoodItem>(`/api/admin/food-items/${id(fid)}`),
    create: (data: Partial<AdminFoodItem>) => request<AdminFoodItem>('/api/admin/food-items', { method: 'POST', body: data }),
    update: (fid: string, data: Partial<AdminFoodItem>) =>
      request<AdminFoodItem>(`/api/admin/food-items/${id(fid)}`, { method: 'PATCH', body: data }),
    remove: (fid: string) => request<void>(`/api/admin/food-items/${id(fid)}`, { method: 'DELETE' }),
  },

  orders: {
    list: (filter: { status?: number; q?: string; limit?: number; offset?: number } = {}) =>
      request<Paged<AdminOrder>>('/api/admin/orders', { query: filter }),
    get: (oid: string) => request<AdminOrder>(`/api/admin/orders/${id(oid)}`),
    advance: (oid: string) => request<AdminOrder>(`/api/admin/orders/${id(oid)}/advance`, { method: 'POST' }),
    cancel: (oid: string) => request<AdminOrder>(`/api/admin/orders/${id(oid)}/cancel`, { method: 'POST' }),
    assign: (oid: string, riderId: string) =>
      request<AdminOrder>(`/api/admin/orders/${id(oid)}/assign`, { method: 'POST', body: { riderId } }),
    unassign: (oid: string) => request<AdminOrder>(`/api/admin/orders/${id(oid)}/unassign`, { method: 'POST' }),
  },

  riders: {
    list: () => request<AdminRider[]>('/api/admin/riders'),
    create: (data: RiderInput) => request<AdminRider>('/api/admin/riders', { method: 'POST', body: data }),
    update: (rid: string, data: RiderPatch) =>
      request<AdminRider>(`/api/admin/riders/${id(rid)}`, { method: 'PATCH', body: data }),
    remove: (rid: string) => request<void>(`/api/admin/riders/${id(rid)}`, { method: 'DELETE' }),
  },

  users: {
    list: (role?: UserRole) => request<AdminUser[]>('/api/admin/users', { query: { role } }),
  },
};
