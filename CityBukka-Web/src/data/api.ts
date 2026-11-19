import type { FoodCategory, FoodItem, Restaurant } from '../types';
import { categories, foodItems, restaurants } from './mockData';

/**
 * Catalogue access. Matches the endpoints of CityBukka-Server
 * (GET /api/restaurants, /api/food-items, …) so an HTTP version can replace
 * `mockCatalogApi` without touching the screens.
 */
export interface CatalogApi {
  getCategories(): Promise<FoodCategory[]>;
  getRestaurants(filter?: { query?: string; cuisine?: string }): Promise<Restaurant[]>;
  getRestaurant(id: string): Promise<Restaurant | null>;
  getFoodItems(filter?: { categoryId?: string; restaurantId?: string; query?: string; popularOnly?: boolean }): Promise<FoodItem[]>;
  getFoodItem(id: string): Promise<FoodItem | null>;
}

const delay = <T,>(ms: number, value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

export const mockCatalogApi: CatalogApi = {
  getCategories: () => delay(100, categories),

  getRestaurants({ query, cuisine } = {}) {
    let result = restaurants;
    const q = query?.trim().toLowerCase();
    if (q) {
      result = result.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.tagline.toLowerCase().includes(q) ||
        r.cuisines.some((c) => c.toLowerCase().includes(q)));
    }
    if (cuisine && cuisine !== 'All') result = result.filter((r) => r.cuisines.includes(cuisine));
    return delay(300, result);
  },

  getRestaurant: (id) => delay(150, restaurants.find((r) => r.id === id) ?? null),

  getFoodItems({ categoryId, restaurantId, query, popularOnly } = {}) {
    let result = foodItems;
    if (restaurantId) result = result.filter((f) => f.restaurantId === restaurantId);
    if (categoryId && categoryId !== 'cat_all') result = result.filter((f) => f.categoryId === categoryId);
    if (popularOnly) result = result.filter((f) => f.isPopular);
    const q = query?.trim().toLowerCase();
    if (q) result = result.filter((f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q));
    return delay(250, result);
  },

  getFoodItem: (id) => delay(150, foodItems.find((f) => f.id === id) ?? null),
};

export const api: CatalogApi = mockCatalogApi;

/** Synchronous lookups for data that is already bundled (e.g. favourites lists). */
export const catalog = {
  restaurantById: (id: string) => restaurants.find((r) => r.id === id) ?? null,
  foodById: (id: string) => foodItems.find((f) => f.id === id) ?? null,
  allFood: foodItems,
  allRestaurants: restaurants,
};
