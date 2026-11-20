import type { CSSProperties, ReactNode } from 'react';
import styles from './Skeleton.module.css';

/** Shimmering placeholder block. Purely decorative – wrap groups in a labelled progressbar. */
export function Skeleton({ width, height, radius, className, style }: {
  width?: number | string; height?: number | string; radius?: number | string; className?: string; style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={`${styles.skeleton} ${className ?? ''}`}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/** Placeholder shaped like a FoodItemCard / RestaurantCard. */
export function CardSkeleton({ variant = 'food' }: { variant?: 'food' | 'restaurant' }) {
  return (
    <div className={styles.card} aria-hidden>
      <Skeleton className={variant === 'food' ? styles.foodMedia : styles.coverMedia} radius={0} />
      <div className={styles.cardBody}>
        <Skeleton height={16} width="70%" />
        <Skeleton height={12} width="95%" />
        <Skeleton height={12} width="55%" />
        <div className={styles.cardFoot}>
          <Skeleton height={18} width={72} />
          <Skeleton height={36} width={64} radius={12} />
        </div>
      </div>
    </div>
  );
}

/**
 * Accessible loading region: announced as a progressbar with `label`,
 * visually a set of skeletons.
 */
export function LoadingRegion({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-busy="true" className={className}>
      {children}
    </div>
  );
}
