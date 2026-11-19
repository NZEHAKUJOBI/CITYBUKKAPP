import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import styles from './PageHeader.module.css';

/** Sticky top bar with a back button – used by pushed screens (checkout, tracking, …). */
export function PageHeader({ title, actions, onBack }: { title: string; actions?: ReactNode; onBack?: () => void }) {
  const navigate = useNavigate();
  const back = onBack ?? (() => (window.history.length > 1 ? navigate(-1) : navigate('/')));
  return (
    <header className={styles.header}>
      <button type="button" className={styles.back} onClick={back} aria-label="Go back">
        <ArrowLeft size={22} />
      </button>
      <h1 className={`${styles.title} ellipsis`}>{title}</h1>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
