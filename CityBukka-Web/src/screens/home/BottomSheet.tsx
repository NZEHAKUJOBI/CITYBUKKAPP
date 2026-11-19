import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './HomeScreen.module.css';

/**
 * Accessible modal bottom sheet (replacement for Flutter's showModalBottomSheet).
 * Escape and backdrop click close it; focus moves into the sheet and is restored on close.
 */
export function BottomSheet({ open, onClose, title, hideTitle = false, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Keep the title for screen readers only (the sheet renders its own visible heading). */
  hideTitle?: boolean;
  children: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.sheetBackdrop} onClick={onClose}>
      <div
        ref={panelRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={styles.sheetHandle} aria-hidden />
        <h2 id={titleId} className={hideTitle ? 'visually-hidden' : styles.sheetTitle}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
