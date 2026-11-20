import { Eye, EyeOff } from 'lucide-react';
import { useId, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import logo from '../../assets/logo_transparent.png';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { errorMessage } from '../../data/client';
import { Screen } from '../../layout/layout';
import { isValidNigerianPhone, PHONE_HINT } from '../../lib/phone';
import { safeNext, useAuth, WrongAppError } from '../../state/AuthContext';
import page from '../../styles/page.module.css';
import styles from './AuthScreens.module.css';

const MIN_PASSWORD = 6;

function Field({ label, hint, error, optional, ...input }: InputHTMLAttributes<HTMLInputElement> & {
  label: string; hint?: string; error?: string; optional?: boolean;
}) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={page.field}>
      <label htmlFor={id} className={page.label}>
        {label}{optional && <span className={page.optional}> (optional)</span>}
      </label>
      <input id={id} className={page.input} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...input} />
      {hint && <p id={`${id}-hint`} className={page.hint}>{hint}</p>}
      {error && <p id={`${id}-error`} className={page.fieldError}>{error}</p>}
    </div>
  );
}

function PasswordField({ label, value, onChange, autoComplete, error, hint }: {
  label: string; value: string; onChange: (v: string) => void; autoComplete: string; error?: string; hint?: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={page.field}>
      <label htmlFor={id} className={page.label}>{label}</label>
      <div className={styles.passwordWrap}>
        <input
          id={id}
          className={page.input}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className={styles.reveal}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </div>
      {hint && <p id={`${id}-hint`} className={page.hint}>{hint}</p>}
      {error && <p id={`${id}-error`} className={page.fieldError}>{error}</p>}
    </div>
  );
}

function AuthLayout({ title, subtitle, children, footer }: {
  title: string; subtitle: string; children: ReactNode; footer: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <Screen header={<PageHeader title="" onBack={() => navigate('/')} />}>
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <img src={logo} alt="" width={64} height={64} />
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
          {children}
          <p className={styles.switch}>{footer}</p>
        </div>
      </div>
    </Screen>
  );
}

/** /login – phone + password. ?next= is where to go afterwards (same-app paths only). */
export function LoginScreen() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isAuthenticated && !busy) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!phone.trim() || !password) {
      setError('Enter your phone number and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(phone.trim(), password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof WrongAppError ? err.message : errorMessage(err, 'Could not sign in. Please try again.'));
      setBusy(false);
    }
  };

  const registerHref = `/register${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to order, track deliveries and see your saved favourites."
      footer={<>New to CityBukka? <Link to={registerHref}>Create an account</Link></>}
    >
      <form className={page.form} onSubmit={submit} noValidate>
        {error && <p role="alert" className={page.formError}>{error}</p>}
        <Field
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0803 123 4567"
          hint={PHONE_HINT}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        <Button type="submit" fullWidth loading={busy} aria-label={busy ? 'Signing in…' : undefined}>Sign in</Button>
      </form>
    </AuthLayout>
  );
}

/** /register – name, phone, password and optional email. */
export function RegisterScreen() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isAuthenticated && !busy) return <Navigate to={next} replace />;

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const found: typeof errors = {};
    if (!form.name.trim()) found.name = 'Tell us your name.';
    if (!isValidNigerianPhone(form.phone)) found.phone = `Enter a valid Nigerian mobile number (${PHONE_HINT}).`;
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) found.email = 'Enter a valid email address.';
    if (form.password.length < MIN_PASSWORD) found.password = `Use at least ${MIN_PASSWORD} characters.`;
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !validate()) return;
    setBusy(true);
    setError(null);
    try {
      await register({
        name: form.name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
      });
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not create your account. Please try again.'));
      setBusy(false);
    }
  };

  const loginHref = `/login${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Order hot bukka meals in Minna and follow every delivery live."
      footer={<>Already have an account? <Link to={loginHref}>Sign in</Link></>}
    >
      <form className={page.form} onSubmit={submit} noValidate>
        {error && <p role="alert" className={page.formError}>{error}</p>}
        <Field label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} required />
        <Field
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0803 123 4567"
          hint={errors.phone ? undefined : PHONE_HINT}
          value={form.phone}
          onChange={set('phone')}
          error={errors.phone}
          required
        />
        <Field
          label="Email"
          optional
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
        />
        <PasswordField
          label="Password"
          value={form.password}
          onChange={(v) => setForm((f) => ({ ...f, password: v }))}
          autoComplete="new-password"
          hint={errors.password ? undefined : `At least ${MIN_PASSWORD} characters.`}
          error={errors.password}
        />
        <Button type="submit" fullWidth loading={busy} aria-label={busy ? 'Creating account…' : undefined}>Create account</Button>
      </form>
    </AuthLayout>
  );
}
