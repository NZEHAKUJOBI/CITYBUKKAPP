import { ChefHat, SearchX, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import banner from '../../assets/header_banner.jpg';
import { FoodItemCard, RestaurantCard } from '../../components/cards';
import { CategoryChip, EmptyState, PromoBanner } from '../../components/small';
import { CardSkeleton, LoadingRegion, Skeleton } from '../../components/Skeleton';
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
 * reload whenever the (debounced) query or category changes. Everything comes
 * from the server – there is no bundled demo menu.
 */
function useHomeData(query: string, categoryId: string) {
  const [categories, setCategories] = useState<FoodCategory[] | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [dishes, setDishes] = useState<FoodItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.getCategories()
      .then((c) => { if (!cancelled) setCategories(c); })
      .catch(() => { if (!cancelled) setCategories([]); });
    return () => { cancelled = true; };
  }, [attempt]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = query.trim() || undefined;
    Promise.all([
      api.getFoodItems({ categoryId: categoryId === ALL ? undefined : categoryId, query: q }),
      api.getRestaurants({ query: q }),
    ]).then(([d, r]) => {
      if (cancelled) return;
      setDishes(d);
      setRestaurants(r);
      setError(false);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setError(true);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [query, categoryId, attempt]);

  const retry = useCallback(() => {
    setDishes(null);
    setCategories(null);
    setAttempt((n) => n + 1);
  }, []);

  return { categories: categories ?? [], categoriesLoaded: categories !== null, restaurants, dishes, loading, error, retry };
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

  const { categories, categoriesLoaded, restaurants, dishes, loading, error, retry } = useHomeData(query, rawCategory);
  // Unknown ?cat= values fall back to "All Dishes" once categories are known.
  const categoryId = !categoriesLoaded || rawCategory === ALL || categories.some((c) => c.id === rawCategory) ? rawCategory : ALL;
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

  const initialLoading = !categoriesLoaded || (dishes === null && !error);
  const showFeatured = query === '' && categoryId === ALL && restaurants.length > 0;
  // Nothing on the menu yet (the admin hasn't added restaurants or dishes).
  const menuEmpty = !loading && !error && query === '' && categoryId === ALL
    && restaurants.length === 0 && (dishes?.length ?? 0) === 0;

  const header = (
    <div className={styles.hero}>
      {/* Banner behind the header, faded into the page background. */}
      <div className={styles.heroMedia} aria-hidden>
        <img src={banner} alt="" className={styles.heroImage} />
        <span className={styles.heroScrim} />
      </div>
      <FadedHeader
        transparentBackground
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onFilterClick={() => setSheet('filter')}
        onNotificationClick={() => toast('No new notifications right now.')}
        onGrabAndGoClick={() => setSheet('grab')}
        addressSubtitle={profile?.selectedAddress || (profile ? 'Add a delivery address in your profile' : 'Sign in to set your delivery address')}
      />
    </div>
  );

  return (
    <div className={styles.root}>
      <Screen className={styles.content}>
        {initialLoading ? (
          <HomeSkeleton />
        ) : error && dishes === null ? (
          <>
            {header}
            <div className={styles.container}>
              <div className={styles.empty}>
                <EmptyState
                  icon={<WifiOff size={48} />}
                  title="Can't load the menu"
                  message="We couldn't reach CityBukka. Check your connection and try again."
                  buttonText="Try again"
                  onButtonClick={retry}
                />
              </div>
            </div>
          </>
        ) : menuEmpty ? (
          <>
            {header}
            <div className={styles.container}>
              <div className={styles.empty}>
                <EmptyState
                  icon={<ChefHat size={48} />}
                  title="Our menu is being prepared"
                  message="Check back soon — our kitchens are getting ready to serve hot bukka meals in Minna."
                />
              </div>
            </div>
          </>
        ) : dishes === null ? null : (
          <>
            {header}

            <div className={styles.container}>
              <div className={styles.promo}>
                <PromoBanner
                  code="BUKKA20"
                  title="20% Off Your First Bukka Feast!"
                  subtitle="Use code BUKKA20 in your bag before checkout."
                  onClaim={claimPromo}
                />
              </div>

              {categories.length > 0 && (
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
              )}

              {showFeatured && (
                <section aria-labelledby="home-top-bukkas" className={styles.section}>
                  <div className={styles.sectionHead}>
                    <h2 id="home-top-bukkas" className={styles.sectionTitle}>Top Bukkas Near You 🔥</h2>
                    <span className={styles.count}>{restaurants.length} bukkas</span>
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

              <section aria-labelledby="home-dishes" aria-busy={loading} className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2 id="home-dishes" className={styles.sectionTitle}>
                    {query ? `Search Results (${dishes.length})` : 'Trending Cravings 🍲'}
                  </h2>
                  {loading ? (
                    <Spinner size={18} color="var(--accent)" label="Updating dishes" />
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
                  <ul className={`${styles.dishes} ${loading ? styles.dishesUpdating : ''}`}>
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
            </div>
          </>
        )}
      </Screen>

      <FilterSheet open={sheet === 'filter'} onClose={closeSheet} />
      <GrabAndGoSheet open={sheet === 'grab'} onClose={closeSheet} />
    </div>
  );
}

/** First-load placeholder that mirrors the real layout (hero, promo, chips, cards). */
function HomeSkeleton() {
  return (
    <LoadingRegion label="Loading menu">
      <div className={styles.skeletonHero}>
        <div className={styles.skeletonHeroInner}>
          <Skeleton width={180} height={14} />
          <Skeleton width="min(420px, 80%)" height={34} radius={10} />
          <Skeleton height={52} radius={999} style={{ maxWidth: 640 }} />
        </div>
      </div>
      <div className={styles.container}>
        <div className={styles.promo}><Skeleton height={132} radius={24} /></div>
        <div className={styles.chips}>
          {[96, 120, 88, 132, 104].map((w, i) => <Skeleton key={i} width={w} height={44} radius={999} />)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHead}><Skeleton width={200} height={22} /></div>
          <div className={styles.dishes}>
            {Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}
