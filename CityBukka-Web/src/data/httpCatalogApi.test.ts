import { foodItems } from '../test/fixtures';
import { catalog, clearCatalogCache } from './api';
import { createHttpCatalogApi } from './httpCatalogApi';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('createHttpCatalogApi', () => {
  it('maps filters to the public query params', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => json([]));
    const api = createHttpCatalogApi({ baseUrl: 'https://api.example.test', fetch: fetchMock });

    await api.getFoodItems({ categoryId: 'cat_rice', restaurantId: 'rest_1', query: ' jollof ', popularOnly: true });
    await api.getRestaurants({ query: 'mama', cuisine: 'Yoruba' });

    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      'https://api.example.test/api/food-items?categoryId=cat_rice&restaurantId=rest_1&q=jollof&popular=true',
    );
    expect(String(fetchMock.mock.calls[1]![0])).toBe('https://api.example.test/api/restaurants?q=mama&cuisine=Yoruba');
  });

  it('prefixes /uploads image paths with the API base and refreshes the cache', async () => {
    const dish = { ...foodItems[0]!, id: 'food_new', imageUrl: '/uploads/abc.webp' };
    const onFoodItems = vi.fn();
    const api = createHttpCatalogApi({
      baseUrl: 'https://api.example.test',
      fetch: vi.fn<typeof fetch>().mockImplementation(async () => json(dish)),
      onFoodItems,
    });

    const result = await api.getFoodItem('food_new');
    expect(result?.imageUrl).toBe('https://api.example.test/uploads/abc.webp');
    expect(onFoodItems).toHaveBeenCalledWith([result]);
  });

  it('keeps an empty image URL empty (no stock photo substitution)', async () => {
    const api = createHttpCatalogApi({
      fetch: vi.fn<typeof fetch>().mockImplementation(async () => json([{ ...foodItems[0]!, imageUrl: '' }])),
    });
    const [dish] = await api.getFoodItems();
    expect(dish!.imageUrl).toBe('');
  });

  it('returns null on 404', async () => {
    const api = createHttpCatalogApi({
      fetch: vi.fn<typeof fetch>().mockImplementation(async () => json({ error: { code: 'not_found', message: 'x' } }, 404)),
    });
    expect(await api.getRestaurant('nope')).toBeNull();
  });

  it('throws on network failures and server errors – there is no bundled fallback menu', async () => {
    const offline = createHttpCatalogApi({ fetch: vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline')) });
    await expect(offline.getCategories()).rejects.toThrow('offline');

    const broken = createHttpCatalogApi({ fetch: vi.fn<typeof fetch>().mockImplementation(async () => json({}, 503)) });
    await expect(broken.getRestaurants()).rejects.toMatchObject({ status: 503 });
  });
});

describe('catalog sync lookups', () => {
  it('starts empty and is filled only from server responses', () => {
    clearCatalogCache();
    expect(catalog.allFood).toEqual([]);
    expect(catalog.allRestaurants).toEqual([]);
    expect(catalog.foodById(foodItems[0]!.id)).toBeNull();
  });
});
