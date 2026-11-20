import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import logo from '../../assets/logo_transparent.png';
import { errorMessage } from '../adminApi';
import { useAdminAuth } from '../auth';
import { Button, ErrorBanner, styles as s, TextField } from '../ui';

export default function LoginPage() {
  const { session, login, expired } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/admin/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to={from} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className={s.loginPage}>
      <div className={s.loginCard}>
        <img src={logo} alt="City Bukka" className={s.loginLogo} />
        <h1>Admin sign in</h1>
        <p className={s.pageSub}>Manage restaurants, menus and orders.</p>
        <form className={s.loginForm} onSubmit={submit}>
          {expired && !error && <ErrorBanner message="Your session expired. Please sign in again." />}
          <ErrorBanner message={error} />
          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="primary" busy={busy}>Sign in</Button>
        </form>
      </div>
    </div>
  );
}
