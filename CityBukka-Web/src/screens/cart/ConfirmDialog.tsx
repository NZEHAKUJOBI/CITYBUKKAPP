import { useEffect, useId, useRef } from 'react';
import styles from './CartScreen.module.css';

/** Port of the Flutter AlertDialog used to confirm emptying the bag. */
export function ConfirmDialog({ title, message, confirmText, onConfirm, onCancel }: {
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onCancel]);

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className={styles.dialogTitle}>{title}</h2>
        <p id={messageId} className={styles.dialogMessage}>{message}</p>
        <div className={styles.dialogActions}>
          <button type="button" ref={cancelRef} className={styles.textButton} onClick={onCancel}>Cancel</button>
          <button type="button" className={`${styles.textButton} ${styles.danger}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
