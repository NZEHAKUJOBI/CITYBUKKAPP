// Small presentational widgets ported from CityBukka-MX lib/ui/core/widgets.
import { Minus, Plus, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { FoodCategory } from '../types';
import { Button } from './Button';
import styles from './small.module.css';

export function RatingBadge({ rating, reviewCount, compact = false }: { rating: number; reviewCount?: number; compact?: boolean }) {
  return (
    <span className={`${styles.rating} ${compact ? styles.ratingCompact : ''}`} aria-label={`Rated ${rating.toFixed(1)}`}>
      <Star size={14} fill="#d97706" color="#d97706" aria-hidden />
      <span className={styles.ratingValue}>{rating.toFixed(1)}</span>
      {reviewCount !== undefined && !compact && <span className={styles.ratingCount}>({reviewCount})</span>}
    </span>
  );
}

export function CategoryChip({ category, selected, onClick }: { category: FoodCategory; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={`${styles.chip} ${selected ? styles.chipSelected : ''}`}>
      <span className={styles.chipEmoji} aria-hidden>{category.iconEmoji}</span>
      {category.name}
    </button>
  );
}

export function QuantitySelector({ quantity, onChange, min = 1, max = 99, compact = false }: {
  quantity: number; onChange: (q: number) => void; min?: number; max?: number; compact?: boolean;
}) {
  const size = compact ? 16 : 18;
  return (
    <div className={`${styles.qty} ${compact ? styles.qtyCompact : ''}`}>
      <button type="button" aria-label="Decrease quantity" disabled={quantity <= min} onClick={() => onChange(quantity - 1)}>
        <Minus size={size} />
      </button>
      <span className={styles.qtyValue} aria-live="polite">{quantity}</span>
      <button type="button" aria-label="Increase quantity" disabled={quantity >= max} onClick={() => onChange(quantity + 1)}>
        <Plus size={size} />
      </button>
    </div>
  );
}

export function EmptyState({ icon, title, message, buttonText, onButtonClick }: {
  icon: ReactNode; title: string; message: string; buttonText?: string; onButtonClick?: () => void;
}) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>{icon}</div>
      <h2 className={styles.emptyTitle}>{title}</h2>
      <p className={styles.emptyMessage}>{message}</p>
      {buttonText && onButtonClick && (
        <Button height={46} onClick={onButtonClick} style={{ marginTop: 24 }}>{buttonText}</Button>
      )}
    </div>
  );
}

export function SearchBar({ value, onChange, onFilterClick, placeholder = 'Search jollof, egusi, suya, bukkas...' }: {
  value: string; onChange: (v: string) => void; onFilterClick?: () => void; placeholder?: string;
}) {
  return (
    <div className={styles.searchRow}>
      <label className={styles.search}>
        <Search size={20} className={styles.searchIcon} aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label="Search dishes and restaurants"
          enterKeyHint="search"
        />
        {value && (
          <button type="button" aria-label="Clear search" onClick={() => onChange('')} className={styles.searchClear}>
            <X size={18} />
          </button>
        )}
      </label>
      {onFilterClick && (
        <button type="button" aria-label="Filters" onClick={onFilterClick} className={styles.filterButton}>
          <SlidersHorizontal size={22} />
        </button>
      )}
    </div>
  );
}

export function PromoBanner({ title, subtitle, code, onClaim }: { title: string; subtitle: string; code: string; onClaim: () => void }) {
  return (
    <div className={styles.promo}>
      <div className={styles.promoBody}>
        <div className={styles.promoTags}>
          <span className={styles.promoCode}>{code}</span>
          <span className={styles.promoLimited}>LIMITED OFFER</span>
        </div>
        <p className={styles.promoTitle}>{title}</p>
        <p className={styles.promoSubtitle}>{subtitle}</p>
      </div>
      <button type="button" className={styles.promoClaim} onClick={onClaim}>Claim</button>
    </div>
  );
}

/** Image that shows a branded placeholder when the photo can't load (e.g. offline). */
export function FallbackImage({ src, alt, fallbackIcon, className }: { src: string; alt: string; fallbackIcon: ReactNode; className?: string }) {
  return (
    <div className={`${styles.imageWrap} ${className ?? ''}`}>
      <div className={styles.imageFallback} aria-hidden>{fallbackIcon}</div>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
      />
    </div>
  );
}
