import { ArrowLeft, ArrowRight, Bike, Clock, MapPin, SearchX, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { FoodItemCard } from '../../components/cards';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, FallbackImage, RatingBadge } from '../../components/small';
import { Spinner } from '../../components/Spinner';
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

  useEffect(() => {
    let cancelled = false;
    setRestaurant(undefined);
    setMenu(null);
    api.getRestaurant(id).then((r) => { if (!cancelled) setRestaurant(r); });
    api.getFoodItems({ restaurantId: id }).then((items) => { if (!cancelled) setMenu(items); });
    return () => { cancelled = true; };
  }, [id]);

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  if (restaurant === undefined) {
    return (
      <Screen header={<PageHeader title="" onBack={goBack} />}>
        <div className={styles.center}><Spinner color="var(--primary)" label="Loading restaurant" /></div>
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
        <ArrowLeft size={22} />
      </button>

      <Screen>
        <div className={styles.hero}>
          <FallbackImage src={restaurant.coverImageUrl} alt={restaurant.name} className={styles.heroImage}
            fallbackIcon={<Store size={60} />} />
          <div className={styles.heroShade} aria-hidden />
        </div>

        <div className={styles.info}>
          <div className={styles.titleRow}>
            <div className={styles.titleCol}>
              <h1 className={styles.name}>{restaurant.name}</h1>
              <p className={styles.tagline}>{restaurant.tagline}</p>
            </div>
            <RatingBadge rating={restaurant.rating} reviewCount={restaurant.reviewCount} />
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <Clock size={18} aria-hidden />
              <span className={styles.statValue}>{deliveryTimeLabel(restaurant.deliveryTimeMin, restaurant.deliveryTimeMax)}</span>
              <span className={styles.statLabel}>Delivery Time</span>
            </div>
            <span className={styles.statDivider} aria-hidden />
            <div className={styles.stat}>
              <Bike size={18} aria-hidden />
              <span className={styles.statValue}>{formatNaira(restaurant.deliveryFee)}</span>
              <span className={styles.statLabel}>Delivery Fee</span>
            </div>
            <span className={styles.statDivider} aria-hidden />
            <div className={styles.stat}>
              <MapPin size={18} aria-hidden />
              <span className={styles.statValue}>{restaurant.distanceKm} km</span>
              <span className={styles.statLabel}>Distance</span>
            </div>
          </div>

          <p className={styles.description}>{restaurant.description}</p>

          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Bukka Specialties</h2>
            <span className={styles.count}>{menu?.length ?? 0} items</span>
          </div>
        </div>

        {menu === null ? (
          <div className={styles.center}><Spinner color="var(--primary)" label="Loading menu" /></div>
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
