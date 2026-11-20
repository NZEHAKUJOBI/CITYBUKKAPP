import { Heart, Store } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { FoodItemCard, RestaurantCard } from '../../components/cards';
import { EmptyState } from '../../components/small';
import { catalog } from '../../data/api';
import { customerApi } from '../../data/customerApi';
import { Screen } from '../../layout/layout';
import { LoadingScreen } from '../../state/AuthContext';
import { useUser } from '../../state/UserContext';
import type { FoodItem, Restaurant } from '../../types';
import styles from './FavoritesScreen.module.css';

const TABS = [
  { key: 'dishes', label: 'Favorite Dishes' },
  { key: 'bukkas', label: 'Bookmarked Bukkas' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

/** Port of FavoritesScreen ("Saved" tab). */
export function FavoritesScreen() {
  const navigate = useNavigate();
  const { favoriteFoodIds, favoriteRestaurantIds, toggleFoodFavorite, toggleRestaurantFavorite } = useUser();
  const [tab, setTab] = useState<TabKey>('dishes');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  // Full records come from GET /api/me/favorites (also fills the sync catalog cache);
  // the id lists from UserContext decide what is still saved, so un-hearting is instant.
  const [loaded, setLoaded] = useState(0);
  useEffect(() => {
    let alive = true;
    customerApi.getFavorites().catch(() => null).finally(() => { if (alive) setLoaded((n) => n + 1); });
    return () => { alive = false; };
  }, []);

  const dishes = useMemo(
    () => favoriteFoodIds.map(catalog.foodById).filter((f): f is FoodItem => f !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [favoriteFoodIds, loaded]);
  const restaurants = useMemo(
    () => favoriteRestaurantIds.map(catalog.restaurantById).filter((r): r is Restaurant => r !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [favoriteRestaurantIds, loaded]);

  const openDish = (item: FoodItem) => navigate(`/dish/${item.id}`);

  const onTabKeyDown = (e: KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[next]!.key);
    tabRefs.current[next]?.focus();
  };

  const header = (
    <header className={styles.header}>
      <h1 className={styles.title}>Saved Cravings</h1>
      <div role="tablist" aria-label="Saved items" className={styles.tabs}>
        {TABS.map((t, i) => {
          const selected = tab === t.key;
          return (
            <button
              key={t.key}
              ref={(el) => { tabRefs.current[i] = el; }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${t.key}`}
              tabIndex={selected ? 0 : -1}
              className={`${styles.tab} ${selected ? styles.tabActive : ''}`}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </header>
  );

  return (
    <Screen header={header}>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${tab}`}
        aria-labelledby={`${baseId}-tab-${tab}`}
        className={styles.panel}
      >
        {loaded === 0 ? (
          <LoadingScreen label="Loading saved items" />
        ) : tab === 'dishes' ? (
          dishes.length === 0 ? (
            <EmptyState
              icon={<Heart size={56} />}
              title="No Favorite Dishes Yet"
              message="Tap the heart icon on any spicy jollof or soup to save it here for quick ordering."
            />
          ) : (
            <ul className={styles.list}>
              {dishes.map((item) => (
                <li key={item.id}>
                  <FoodItemCard
                    item={item}
                    onOpen={() => openDish(item)}
                    onAdd={() => openDish(item)}
                    isFavorite
                    onToggleFavorite={() => toggleFoodFavorite(item.id)}
                  />
                </li>
              ))}
            </ul>
          )
        ) : restaurants.length === 0 ? (
          <EmptyState
            icon={<Store size={56} />}
            title="No Bookmarked Bukkas"
            message="Bookmark your top local eateries to keep tabs on their daily specials."
          />
        ) : (
          <ul className={`${styles.list} ${styles.restaurantList}`}>
            {restaurants.map((r) => (
              <li key={r.id}>
                <RestaurantCard
                  restaurant={r}
                  onOpen={() => navigate(`/restaurant/${r.id}`)}
                  isFavorite
                  onToggleFavorite={() => toggleRestaurantFavorite(r.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Screen>
  );
}
