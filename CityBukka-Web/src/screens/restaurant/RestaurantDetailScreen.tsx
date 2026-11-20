import { ArrowLeft, ArrowRight, Bike, ChefHat, Clock, MapPin, SearchX, ShoppingBag, Store, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { FoodItemCard } from '../../components/cards';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, FallbackImage, RatingBadge } from '../../components/small';
import { CardSkeleton, LoadingRegion, Skeleton } from '../../components/Skeleton';
import { api } from '../../data/api';
import { Screen } from '../../layout/layout';
import { deliveryTimeLabel, formatNaira } from '../../lib/format';
import { useCart } from '../../state/CartContext';
import { useUser } from '../../state/UserContext';
import type { FoodItem, Restaurant } from '../../types';
import styles from './RestaurantDetailScreen.module.css';

/** Port of RestaurantDetailScreen (route /restaurant/:id). */
export function RestaurantDetailScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null | undefined>(undefined);
  const [menu, setMenu] = useState<FoodItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setRestaurant(undefined);
    setMenu(null);
    setFailed(false);
    const fail = () => { if (!cancelled) setFailed(true); };
    api.getRestaurant(id).then((r) => { if (!cancelled) setRestaurant(r); }, fail);
    api.getFoodItems({ restaurantId: id }).then((items) => { if (!cancelled) setMenu(items); }, () => {
      if (!cancelled) setMenu([]);
    });
    return () => { cancelled = true; };
  }, [id, attempt]);

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  if (failed) {
    return (
      <Screen header={<PageHeader title="Bukka" onBack={goBack} />}>
        <EmptyState
          icon={<WifiOff size={56} />}
          title="Can't load this bukka"
          message="We couldn't reach CityBukka. Check your connection and try again."
          buttonText="Try again"
          onButtonClick={() => setAttempt((n) => n + 1)}
        />
      </Screen>
    );
  }

  if (restaurant === undefined) {
    return (
      <Screen header={<PageHeader title="" onBack={goBack} />}>
        <LoadingRegion label="Loading restaurant" className={styles.loading}>
          <Skeleton className={styles.heroSkeleton} radius={0} />
          <div className={styles.info}>
            <Skeleton width="60%" height={30} radius={10} />
            <Skeleton width="40%" height={14} style={{ marginTop: 12 }} />
            <Skeleton height={76} radius={18} style={{ marginTop: 24 }} />
          </div>
        </LoadingRegion>
      </Screen>
    );
  }

  if (restaurant === null) {
    return (
      <Screen header={<PageHeader title="Bukka" onBack={goBack} />}>
        <EmptyState
          icon={<SearchX size={56} />}
          title="Bukka not found"
          message="We couldn't find this restaurant. It may have closed its doors on CityBukka."
          buttonText="Back to Explore"
          onButtonClick={() => navigate('/')}
        />
      </Screen>
    );
  }

  return <RestaurantDetail restaurant={restaurant} menu={menu} onBack={goBack} />;
}

function RestaurantDetail({ restaurant, menu, onBack }: {
  restaurant: Restaurant; menu: FoodItem[] | null; onBack: () => void;
}) {
  const navigate = useNavigate();
  const { itemCount, total } = useCart();
  const { isFoodFavorite, toggleFoodFavorite } = useUser();
  const openDish = (item: FoodItem) => navigate(`/dish/${item.id}`);

  return (
    <div className={styles.root}>
      <button type="button" className={styles.backButton} onClick={onBack} aria-label="Go back">
        <ArrowLeft size={22} aria-hidden />
      </button>

      <Screen className={itemCount > 0 ? styles.withBagBar : undefined}>
        <div className={styles.hero}>
          <FallbackImage src={restaurant.coverImageUrl} alt={restaurant.name} className={styles.heroImage}
            fallbackIcon={<Store size={60} />} priority />
          <div className={styles.heroShade} aria-hidden />
        </div>

        <div className={styles.info}>
          <div className={styles.infoCard}>
            <div className={styles.titleRow}>
              <div className={styles.titleCol}>
                <div className={styles.flags}>
                  <span className={restaurant.isOpen ? styles.open : styles.closed}>
                    {restaurant.isOpen ? 'Open now' : 'Closed'}
                  </span>
                  {restaurant.cuisines.slice(0, 3).map((c) => <span key={c} className={styles.cuisine}>{c}</span>)}
                </div>
                <h1 className={styles.name}>{restaurant.name}</h1>
                <p className={styles.tagline}>{restaurant.tagline}</p>
              </div>
              <RatingBadge rating={restaurant.rating} reviewCount={restaurant.reviewCount} />
            </div>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statIcon}><Clock size={18} aria-hidden /></span>
                <span className={styles.statValue}>{deliveryTimeLabel(restaurant.deliveryTimeMin, restaurant.deliveryTimeMax)}</span>
                <span className={styles.statLabel}>Delivery Time</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statIcon}><Bike size={18} aria-hidden /></span>
                <span className={styles.statValue}>{formatNaira(restaurant.deliveryFee)}</span>
                <span className={styles.statLabel}>Delivery Fee</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statIcon}><MapPin size={18} aria-hidden /></span>
                <span className={styles.statValue}>{restaurant.distanceKm} km</span>
                <span className={styles.statLabel}>Distance</span>
              </div>
            </div>

            <p className={styles.description}>{restaurant.description}</p>
            {restaurant.address && (
              <p className={styles.address}><MapPin size={14} aria-hidden /> {restaurant.address}</p>
            )}
          </div>

          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Bukka Specialties</h2>
            <span className={styles.count}>{menu?.length ?? 0} items</span>
          </div>
        </div>

        {menu === null ? (
          <LoadingRegion label="Loading menu" className={styles.menu}>
            {Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)}
          </LoadingRegion>
        ) : menu.length === 0 ? (
          <EmptyState
            icon={<ChefHat size={48} />}
            title="Menu coming soon"
            message="This bukka's menu is being prepared — check back soon."
          />
        ) : (
          <ul className={styles.menu}>
            {menu.map((item) => (
              <li key={item.id}>
                <FoodItemCard
                  item={item}
                  onOpen={() => openDish(item)}
                  onAdd={() => openDish(item)}
                  isFavorite={isFoodFavorite(item.id)}
                  onToggleFavorite={() => toggleFoodFavorite(item.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </Screen>

      {itemCount > 0 && (
        <button type="button" className={styles.bagBar} onClick={() => navigate('/bag')}>
          <span className={styles.bagLeft}>
            <span className={styles.bagCount}>{itemCount}</span>
            <ShoppingBag size={18} aria-hidden />
            View Bag
          </span>
          <span className={styles.bagRight}>
            {formatNaira(total)}
            <ArrowRight size={18} aria-hidden />
          </span>
        </button>
      )}
    </div>
  );
}
