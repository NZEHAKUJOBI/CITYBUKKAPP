import { ImageOff, LoaderCircle, Search, X } from 'lucide-react';
import {
  useEffect, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type KeyboardEvent, type ReactNode,
} from 'react';
import s from './admin.module.css';
import { STATUS_LABELS, statusKey } from './types';

export const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

type Variant = 'default' | 'primary' | 'danger' | 'ghost';

export function Button({ variant = 'default', small, busy, className, children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean; busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || busy}
      className={cx(s.btn, variant !== 'default' && s[variant], small && s.small, className)}
    >
      {busy && <LoaderCircle size={14} className={s.spin} aria-hidden />}
      {children}
    </button>
  );
}

export function IconButton({ label, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={s.iconBtn} {...rest}>
      {children}
    </button>
  );
}

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={s.pageHead}>
      <div>
        <h1 className={s.pageTitle}>{title}</h1>
        {subtitle && <p className={s.pageSub}>{subtitle}</p>}
      </div>
      {actions && <div className={s.toolbar} style={{ margin: 0 }}>{actions}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className={s.loading} role="status">
      <LoaderCircle size={18} className={s.spin} aria-hidden /> {label}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string | null; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div className={s.errorBanner} role="alert">
      <span>{message}</span>
      {onRetry && <Button small variant="ghost" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className={s.empty}>{children}</div>;
}

export function SearchInput({ value, onChange, placeholder = 'Search…', label = 'Search' }:
  { value: string; onChange: (v: string) => void; placeholder?: string; label?: string }) {
  return (
    <div className={cx(s.searchWrap, s.grow)}>
      <Search size={16} aria-hidden />
      <input
        className={s.input}
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function Field({ label, hint, error, full, children, htmlFor }:
  { label: string; hint?: ReactNode; error?: string; full?: boolean; children: ReactNode; htmlFor?: string }) {
  return (
    <div className={cx(s.field, full && s.full)}>
      <label className={s.label} htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <span className={s.fieldError}>{error}</span> : hint ? <span className={s.hint}>{hint}</span> : null}
    </div>
  );
}

/** Labelled text/number input. */
export function TextField({ label, hint, error, full, ...input }:
  InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; error?: string; full?: boolean }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} full={full} htmlFor={id}>
      <input id={id} className={s.input} {...input} />
    </Field>
  );
}

export function TextArea({ label, value, onChange, full = true, rows = 3 }:
  { label: string; value: string; onChange: (v: string) => void; full?: boolean; rows?: number }) {
  const id = useId();
  return (
    <Field label={label} full={full} htmlFor={id}>
      <textarea id={id} className={s.input} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={s.check}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Toggle({ label, checked, onChange, disabled }:
  { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <span className={s.switch}>
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        title={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={s.switchTrack} />
    </span>
  );
}

/** Tag-style editor for string arrays (cuisines, badges). Enter or comma adds a value. */
export function ChipsInput({ label, value, onChange, placeholder = 'Type and press Enter' }:
  { label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    const next = [...value];
    for (const p of parts) if (!next.includes(p)) next.push(p);
    if (next.length !== value.length) onChange(next);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <Field label={label} htmlFor={id} hint="Press Enter or comma to add">
      <div className={s.chips}>
        {value.map((v) => (
          <span key={v} className={s.chip}>
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          className={s.chipInput}
          value={draft}
          placeholder={value.length ? '' : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft.trim() && add(draft)}
        />
      </div>
    </Field>
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
}

export function Modal({ title, onClose, children, footer, small }:
  { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; small?: boolean }) {
  useEscape(onClose);
  const titleId = useId();
  return (
    <div className={s.backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={cx(s.modal, small && s.modalSmall)} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={s.modalHead}>
          <h2 id={titleId}>{title}</h2>
          <IconButton label="Close" onClick={onClose}><X size={18} /></IconButton>
        </div>
        <div className={s.modalBody}>{children}</div>
        {footer && <div className={s.modalFoot}>{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ title, onClose, children, footer }:
  { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEscape(onClose);
  const titleId = useId();
  return (
    <>
      <div className={s.drawerBackdrop} onClick={onClose} />
      <aside className={s.drawer} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={s.modalHead}>
          <h2 id={titleId}>{title}</h2>
          <IconButton label="Close" onClick={onClose}><X size={18} /></IconButton>
        </div>
        <div className={s.modalBody}>{children}</div>
        {footer && <div className={s.modalFoot}>{footer}</div>}
      </aside>
    </>
  );
}

export function ConfirmDialog({
  title, message, confirmLabel = 'Delete', confirmVariant = 'danger', busy, error, onConfirm, onCancel,
}: {
  title: string; message: ReactNode; confirmLabel?: string; confirmVariant?: Variant; busy?: boolean; error?: string | null;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal
      small
      title={title}
      onClose={onCancel}
      footer={(
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant={confirmVariant} busy={busy} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      )}
    >
      <ErrorBanner message={error ?? null} />
      <p style={{ margin: 0 }}>{message}</p>
    </Modal>
  );
}

/** List thumbnail; shows a "no photo" placeholder instead of a broken/empty image. */
export function Thumb({ src }: { src: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  if (!src || broken) {
    return (
      <span className={cx(s.thumb, s.thumbEmpty)} title="No photo yet" aria-label="No photo yet" role="img">
        <ImageOff size={18} aria-hidden />
      </span>
    );
  }
  return <img className={s.thumb} src={src} alt="" loading="lazy" onError={() => setBroken(true)} />;
}

export function StatusBadge({ status }: { status: number }) {
  const key = statusKey(status);
  return <span className={cx(s.badge, s[`st_${key}`])}>{STATUS_LABELS[key]}</span>;
}

export function Badge({ tone, children }: { tone?: 'ok' | 'off'; children: ReactNode }) {
  return <span className={cx(s.badge, tone && s[tone])}>{children}</span>;
}

export const formatDateTime = (iso: string | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

/** Number input helper: '' stays '' while typing, otherwise a number. */
export const toNumber = (v: string | number, fallback = 0) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Debounce a value (for search boxes). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export { s as styles };
