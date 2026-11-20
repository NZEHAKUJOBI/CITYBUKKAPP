// Small presentational widgets ported from CityBukka-MX lib/ui/core/widgets.
import { Minus, Plus, Search, SlidersHorizontal, Star, UtensilsCrossed, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { FoodCategory } from '../types';
import { Button } from './Button';
import styles from './small.module.css';

export function RatingBadge({ rating, reviewCount, compact = false }: { rating: number; reviewCount?: number; compact?: boolean }) {
  return (
    <span className={`${styles.rating} ${compact ? styles.ratingCompact : ''}`} aria-label={`Rated ${rating.toFixed(1)}`}>
      <Star size={compact ? 12 : 13} fill="currentColor" strokeWidth={0} className={styles.ratingStar} aria-hidden />
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
        <Minus size={size} aria-hidden />
      </button>
      <span className={styles.qtyValue} aria-live="polite">{quantity}</span>
      <button type="button" aria-label="Increase quantity" disabled={quantity >= max} onClick={() => onChange(quantity + 1)}>
        <Plus size={size} aria-hidden />
      </button>
    </div>
  );
}

export function EmptyState({ icon, title, message, buttonText, onButtonClick }: {
  icon: ReactNode; title: string; message: string; buttonText?: string; onButtonClick?: () => void;
}) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyArt} aria-hidden>
        <span className={styles.emptyRing} />
        <span className={styles.emptyRing} />
        <div className={styles.emptyIcon}>{icon}</div>
      </div>
      <h2 className={styles.emptyTitle}>{title}</h2>
      <p className={styles.emptyMessage}>{message}</p>
      {buttonText && onButtonClick && (
        <Button height={48} onClick={onButtonClick} className={styles.emptyButton}>{buttonText}</Button>
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
            <X size={18} aria-hidden />
          </button>
        )}
      </label>
      {onFilterClick && (
        <button type="button" aria-label="Filters" onClick={onFilterClick} className={styles.filterButton}>
          <SlidersHorizontal size={20} aria-hidden />
        </button>
      )}
    </div>
  );
}

export function PromoBanner({ title, subtitle, code, onClaim }: { title: string; subtitle: string; code: string; onClaim: () => void }) {
  return (
    <div className={styles.promo}>
      <span className={styles.promoGlow} aria-hidden />
      <span className={styles.promoEmoji} aria-hidden>🍛</span>
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

/**
 * Image in an aspect-ratio box (set by `className`): lazy-loaded, fades in once
 * decoded, shimmers while loading. When there is no photo yet (empty URL – the
 * admin hasn't uploaded one) or it can't load, a branded placeholder is shown
 * instead: the utensils mark on the theme surface. Never a stock photo.
 */
export function FallbackImage({ src, alt, fallbackIcon, className, priority = false }: {
  src: string | null | undefined; alt: string; fallbackIcon?: ReactNode; className?: string; priority?: boolean;
}) {
  const url = src?.trim() ?? '';
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(url ? 'loading' : 'error');
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setStatus(url ? 'loading' : 'error');
    const img = imgRef.current;
    // Cached images may finish before React attaches the listeners.
    if (img?.complete && img.naturalWidth > 0) setStatus('loaded');
  }, [url]);

  const mark = <span className={styles.placeholderMark}>{fallbackIcon ?? <UtensilsCrossed size={32} />}</span>;

  return (
    <div className={`${styles.imageWrap} ${styles[status]} ${className ?? ''}`}>
      {status === 'error' && alt ? (
        <div className={styles.imageFallback} role="img" aria-label={alt} data-placeholder="">{mark}</div>
      ) : (
        <div className={styles.imageFallback} aria-hidden data-placeholder={status === 'error' ? '' : undefined}>{mark}</div>
      )}
      {url && status !== 'error' && (
        <img
          ref={imgRef}
          src={url}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...(priority ? { fetchPriority: 'high' as const } : {})}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      )}
    </div>
  );
}
