import { Clock, Flame, Heart, MapPin, Plus, Bike, Store, UtensilsCrossed } from 'lucide-react';
import type { MouseEvent } from 'react';
import { deliveryTimeLabel, formatNaira, SPICE_LABELS } from '../lib/format';
import type { FoodItem, Restaurant } from '../types';
import { FallbackImage, RatingBadge } from './small';
import styles from './cards.module.css';

function FavoriteButton({ active, onToggle, label }: { active: boolean; onToggle: () => void; label: string }) {
  const click = (e: MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };
  return (
    <button
      type="button"
      className={styles.favorite}
      onClick={click}
      aria-pressed={active}
      aria-label={active ? `Remove ${label} from saved` : `Save ${label}`}
    >
      <Heart size={18} fill={active ? 'var(--favorite)' : 'none'} color={active ? 'var(--favorite)' : '#fff'} />
    </button>
  );
}

/** Port of FoodItemCard. */
export function FoodItemCard({ item, onOpen, onAdd, isFavorite, onToggleFavorite }: {
  item: FoodItem;
  onOpen: () => void;
  onAdd: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <article className={styles.card} onClick={onOpen}>
      <div className={styles.media}>
        <FallbackImage src={item.imageUrl} alt={item.name} className={styles.foodImage}
          fallbackIcon={<UtensilsCrossed size={36} />} />
        <span className={styles.spice}>{SPICE_LABELS[item.spiceLevel]}</span>
        <FavoriteButton active={isFavorite} onToggle={onToggleFavorite} label={item.name} />
      </div>
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h3 className={`${styles.foodName} ellipsis`}>
            <button type="button" className={styles.openLink} onClick={(e) => { e.stopPropagation(); onOpen(); }}>
              {item.name}
            </button>
          </h3>
          <RatingBadge rating={item.rating} compact />
        </div>
        <p className={`${styles.description} clamp-2`}>{item.description}</p>
        <div className={styles.priceRow}>
          <span className={styles.price}>{formatNaira(item.price)}</span>
          <button
            type="button"
            className={styles.add}
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            aria-label={`Add ${item.name} to bag`}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>
    </article>
  );
}

/** Port of RestaurantCard. */
export function RestaurantCard({ restaurant, onOpen, isFavorite, onToggleFavorite }: {
  restaurant: Restaurant;
  onOpen: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <article className={`${styles.card} ${styles.restaurant}`} onClick={onOpen}>
      <div className={styles.media}>
        <FallbackImage src={restaurant.coverImageUrl} alt={restaurant.name} className={styles.coverImage}
          fallbackIcon={<Store size={40} />} />
        {restaurant.isFeatured && (
          <span className={styles.featured}><Flame size={13} /> HOT BUKKA</span>
        )}
        <FavoriteButton active={isFavorite} onToggle={onToggleFavorite} label={restaurant.name} />
        <span className={styles.eta}>
          <Clock size={14} color="var(--secondary)" />
          {deliveryTimeLabel(restaurant.deliveryTimeMin, restaurant.deliveryTimeMax)}
        </span>
      </div>
      <div className={styles.body} style={{ padding: 14 }}>
        <div className={styles.titleRow}>
          <h3 className={`${styles.restaurantName} ellipsis`}>
            <button type="button" className={styles.openLink} onClick={(e) => { e.stopPropagation(); onOpen(); }}>
              {restaurant.name}
            </button>
          </h3>
          <RatingBadge rating={restaurant.rating} reviewCount={restaurant.reviewCount} />
        </div>
        <p className={`${styles.tagline} ellipsis`}>{restaurant.tagline}</p>
        <div className={styles.meta}>
          <span><MapPin size={15} /> {restaurant.distanceKm} km away</span>
          <span className={styles.fee}><Bike size={16} /> {formatNaira(restaurant.deliveryFee)}</span>
        </div>
      </div>
    </article>
  );
}
