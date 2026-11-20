import { API_BASE_URL } from '../config/env';
import type { FoodCategory, FoodItem, Restaurant } from '../types';
import { createHttpCatalogApi } from './httpCatalogApi';

/**
 * Catalogue access. Matches the public endpoints of CityBukka-Server
 * (GET /api/restaurants, /api/food-items, …). There is no bundled demo data:
 * until the admin adds restaurants and dishes the app is simply empty.
 */
export interface CatalogApi {
  getCategories(): Promise<FoodCategory[]>;
  getRestaurants(filter?: { query?: string; cuisine?: string }): Promise<Restaurant[]>;
  getRestaurant(id: string): Promise<Restaurant | null>;
  getFoodItems(filter?: { categoryId?: string; restaurantId?: string; query?: string; popularOnly?: boolean }): Promise<FoodItem[]>;
  getFoodItem(id: string): Promise<FoodItem | null>;
}

// ---------------------------------------------------------------------------
// Synchronous lookup cache, filled only from server responses.
// ---------------------------------------------------------------------------

const restaurantCache = new Map<string, Restaurant>();
const foodCache = new Map<string, FoodItem>();

export function cacheRestaurants(items: Restaurant[]) {
  for (const r of items) restaurantCache.set(r.id, r);
}

export function cacheFoodItems(items: FoodItem[]) {
  for (const f of items) foodCache.set(f.id, f);
}

/** Test helper / sign-out: forget everything loaded so far. */
export function clearCatalogCache() {
  restaurantCache.clear();
  foodCache.clear();
}

export const api: CatalogApi = createHttpCatalogApi({
  baseUrl: API_BASE_URL,
  onRestaurants: cacheRestaurants,
  onFoodItems: cacheFoodItems,
});

/** Synchronous lookups for data the server has already returned. */
export const catalog = {
  restaurantById: (id: string): Restaurant | null => restaurantCache.get(id) ?? null,
  foodById: (id: string): FoodItem | null => foodCache.get(id) ?? null,
  get allFood(): FoodItem[] {
    return [...foodCache.values()];
  },
  get allRestaurants(): Restaurant[] {
    return [...restaurantCache.values()];
  },
};
