import { apiUrl, resolveMediaUrl } from '../config/env';
import type { FoodCategory, FoodItem, Restaurant } from '../types';
import type { CatalogApi } from './api';

/** Thrown for HTTP responses the client can't use (non-2xx other than 404). */
export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export interface HttpCatalogOptions {
  /** API origin; '' means same origin. */
  baseUrl?: string;
  fetch?: typeof fetch;
  /** Called with every fresh list/entity the server returns (used to refresh the sync `catalog` cache). */
  onRestaurants?: (items: Restaurant[]) => void;
  onFoodItems?: (items: FoodItem[]) => void;
  /** Request timeout in ms (default 8000). */
  timeoutMs?: number;
}

export const normalizeRestaurant = (r: Restaurant, base: string): Restaurant => ({
  ...r,
  coverImageUrl: resolveMediaUrl(r.coverImageUrl, base),
  logoUrl: resolveMediaUrl(r.logoUrl, base),
  cuisines: r.cuisines ?? [],
  badges: r.badges ?? [],
});

export const normalizeFood = (f: FoodItem, base: string): FoodItem => ({
  ...f,
  imageUrl: resolveMediaUrl(f.imageUrl, base),
  customizationGroups: f.customizationGroups ?? [],
});

/**
 * CatalogApi backed by CityBukka-Server's public endpoints.
 * There is no offline fallback data: network/server errors are thrown so screens can show
 * an error state (the service worker may still answer from its API cache).
 */
export function createHttpCatalogApi(options: HttpCatalogOptions = {}): CatalogApi {
  const base = options.baseUrl ?? '';
  const doFetch = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const timeoutMs = options.timeoutMs ?? 8000;

  async function getJson<T>(path: string, params?: Record<string, string | boolean | undefined>): Promise<T | null> {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
    try {
      const res = await doFetch(apiUrl(path, params, base), {
        headers: { Accept: 'application/json' },
        signal: controller?.signal,
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new HttpError(res.status, `GET ${path} failed with ${res.status}`);
      return (await res.json()) as T;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return {
    getCategories: async () => (await getJson<FoodCategory[]>('/api/categories')) ?? [],

    async getRestaurants(filter = {}) {
      const list = ((await getJson<Restaurant[]>('/api/restaurants', { q: filter.query?.trim(), cuisine: filter.cuisine })) ?? [])
        .map((r) => normalizeRestaurant(r, base));
      options.onRestaurants?.(list);
      return list;
    },

    async getRestaurant(id) {
      const r = await getJson<Restaurant>(`/api/restaurants/${encodeURIComponent(id)}`);
      if (!r) return null;
      const restaurant = normalizeRestaurant(r, base);
      options.onRestaurants?.([restaurant]);
      return restaurant;
    },

    async getFoodItems(filter = {}) {
      const list = ((await getJson<FoodItem[]>('/api/food-items', {
        categoryId: filter.categoryId,
        restaurantId: filter.restaurantId,
        q: filter.query?.trim(),
        popular: filter.popularOnly ? 'true' : undefined,
      })) ?? []).map((f) => normalizeFood(f, base));
      options.onFoodItems?.(list);
      return list;
    },

    async getFoodItem(id) {
      const f = await getJson<FoodItem>(`/api/food-items/${encodeURIComponent(id)}`);
      if (!f) return null;
      const food = normalizeFood(f, base);
      options.onFoodItems?.([food]);
      return food;
    },
  };
}
