import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outlined' | 'green' | 'gold';
  loading?: boolean;
  icon?: ReactNode;
  /** Height in px; Flutter CustomButton default is 52. */
  height?: number;
  fullWidth?: boolean;
}

/** Port of CustomButton. */
export function Button({
  variant = 'primary', loading = false, icon, height = 52, fullWidth = false,
  className, children, disabled, style, ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[styles.button, styles[variant], fullWidth && styles.full, className].filter(Boolean).join(' ')}
      style={{ height, ...style }}
    >
      {loading ? <Spinner size={20} /> : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}
