import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import styles from './Toast.module.css';

type ToastTone = 'default' | 'success' | 'error';
interface Toast { id: number; message: string; tone: ToastTone }

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);

/** Replacement for Flutter's SnackBar: short message at the bottom of the screen. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const show = useCallback((message: string, tone: ToastTone = 'default') => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.tone]}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
