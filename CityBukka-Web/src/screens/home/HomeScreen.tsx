import { SearchX } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import banner from '../../assets/header_banner.jpg';
import { FoodItemCard, RestaurantCard } from '../../components/cards';
import { CategoryChip, EmptyState, PromoBanner } from '../../components/small';
import { Spinner } from '../../components/Spinner';
import { api } from '../../data/api';
import { Screen } from '../../layout/layout';
import { useCart } from '../../state/CartContext';
import { useToast } from '../../state/ToastContext';
import { useUser } from '../../state/UserContext';
import type { FoodCategory, FoodItem, Restaurant } from '../../types';
import { FadedHeader } from './FadedHeader';
import { FilterSheet, GrabAndGoSheet } from './HomeSheets';
import styles from './HomeScreen.module.css';

const ALL = 'cat_all';
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Port of HomeViewModel's data flow: categories load once; dishes and restaurants
 * reload whenever the (debounced) query or category changes.
 */
function useHomeData(query: string, categoryId: string) {
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [dishes, setDishes] = useState<FoodItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void api.getCategories().then((c) => { if (!cancelled) setCategories(c); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = query.trim() || undefined;
    void Promise.all([
      api.getFoodItems({ categoryId: categoryId === ALL ? undefined : categoryId, query: q }),
      api.getRestaurants({ query: q }),
    ]).then(([d, r]) => {
      if (cancelled) return;
      setDishes(d);
      setRestaurants(r);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [query, categoryId]);

  return { categories, restaurants, dishes, loading };
}

export function HomeScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const { addItem, applyPromo } = useCart();
  const { profile, isFoodFavorite, toggleFoodFavorite, isRestaurantFavorite, toggleRestaurantFavorite } = useUser();

  // Search text and category live in the URL (?q=&cat=) so they survive tab switches.
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const rawCategory = params.get('cat') || ALL;
  const [searchInput, setSearchInput] = useState(query);

  const updateParam = useCallback((key: 'q' | 'cat', value: string, empty: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === empty) next.delete(key); else next.set(key, value);
      return next;
    }, { replace: true });
  }, [setParams]);

  // Debounce search input → URL.
  useEffect(() => {
    if (searchInput === query) return;
    const t = setTimeout(() => updateParam('q', searchInput, ''), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput, query, updateParam]);

  const { categories, restaurants, dishes, loading } = useHomeData(query, rawCategory);
  // Unknown ?cat= values fall back to "All Dishes" once categories are known.
  const categoryId = categories.length === 0 || categories.some((c) => c.id === rawCategory) ? rawCategory : ALL;
  useEffect(() => {
    if (categoryId !== rawCategory) updateParam('cat', ALL, ALL);
  }, [categoryId, rawCategory, updateParam]);

  const [sheet, setSheet] = useState<'filter' | 'grab' | null>(null);
  const closeSheet = useCallback(() => setSheet(null), []);

  const resetFilters = () => {
    setSearchInput('');
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('q');
      next.delete('cat');
      return next;
    }, { replace: true });
  };

  const claimPromo = () => {
    if (applyPromo('BUKKA20')) toast('Promo code BUKKA20 copied & applied to your bag!', 'success');
    else toast('Promo code BUKKA20 is no longer valid.', 'error');
  };

  const quickAdd = (dish: FoodItem) => {
    addItem({ foodItem: dish });
    toast(`${dish.name} added to your bag`, 'success');
  };

  const initialLoading = categories.length === 0 || dishes === null;
  const showFeatured = query === '' && categoryId === ALL;

  return (
    <div className={styles.root}>
      {/* Ambient banner background (fixed behind the scrolling content). */}
      <div className={styles.ambient} aria-hidden>
        <img src={banner} alt="" className={styles.ambientFull} />
        <img src={banner} alt="" className={styles.ambientTop} />
        <span className={styles.ambientFade} />
      </div>

      <Screen className={styles.content}>
        {initialLoading ? (
          <div className={styles.loading}>
            <Spinner size={36} color="var(--primary)" label="Loading menu" />
          </div>
        ) : (
          <>
            <FadedHeader
              transparentBackground
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              onFilterClick={() => setSheet('filter')}
              onNotificationClick={() => toast('No new notifications right now.')}
              onGrabAndGoClick={() => setSheet('grab')}
              addressSubtitle={profile.selectedAddress}
            />

            <div className={styles.promo}>
              <PromoBanner
                code="BUKKA20"
                title="20% Off Your First Bukka Feast!"
                subtitle="Use code BUKKA20 at checkout on orders above ₦3,000."
                onClaim={claimPromo}
              />
            </div>

            <div className={`${styles.chips} no-scrollbar`} role="group" aria-label="Categories">
              {categories.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  category={cat}
                  selected={categoryId === cat.id}
                  onClick={() => updateParam('cat', cat.id, ALL)}
                />
              ))}
            </div>

            {showFeatured && (
              <section aria-labelledby="home-top-bukkas">
                <div className={styles.sectionHead}>
                  <h2 id="home-top-bukkas" className={styles.sectionTitle}>Top Bukkas Near You 🔥</h2>
                  <span className={styles.viewAll}>View All</span>
                </div>
                <ul className={`${styles.carousel} no-scrollbar`}>
                  {restaurants.map((r) => (
                    <li key={r.id} className={styles.carouselItem}>
                      <RestaurantCard
                        restaurant={r}
                        onOpen={() => navigate(`/restaurant/${r.id}`)}
                        isFavorite={isRestaurantFavorite(r.id)}
                        onToggleFavorite={() => toggleRestaurantFavorite(r.id)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="home-dishes" aria-busy={loading}>
              <div className={styles.sectionHead}>
                <h2 id="home-dishes" className={styles.sectionTitle}>
                  {query ? `Search Results (${dishes.length})` : 'Trending Cravings 🍲'}
                </h2>
                {loading ? (
                  <Spinner size={18} color="var(--primary)" label="Updating dishes" />
                ) : (
                  !query && <span className={styles.count}>{dishes.length} items</span>
                )}
              </div>

              {dishes.length === 0 ? (
                <div className={styles.empty}>
                  <EmptyState
                    icon={<SearchX size={48} />}
                    title="No Dishes Found"
                    message="Try searching for another dish or reset your active category filter."
                    buttonText="Reset Filters"
                    onButtonClick={resetFilters}
                  />
                </div>
              ) : (
                <ul className={styles.dishes}>
                  {dishes.map((dish) => (
                    <li key={dish.id}>
                      <FoodItemCard
                        item={dish}
                        onOpen={() => navigate(`/dish/${dish.id}`)}
                        onAdd={() => quickAdd(dish)}
                        isFavorite={isFoodFavorite(dish.id)}
                        onToggleFavorite={() => toggleFoodFavorite(dish.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </Screen>

      <FilterSheet open={sheet === 'filter'} onClose={closeSheet} />
      <GrabAndGoSheet open={sheet === 'grab'} onClose={closeSheet} />
    </div>
  );
}
