import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import logo from '../../assets/logo_transparent.png';
import { Button, ErrorBanner, styles as s, TextField } from '../../admin/ui';
import { useRiderAuth } from '../auth';
import r from '../rider.module.css';
import { DISABLED_MESSAGE, riderErrorMessage } from '../riderApi';

export default function RiderLoginPage() {
  const { session, login, endReason } = useRiderAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/rider';
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to={from.startsWith('/rider') ? from : '/rider'} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(phone.trim(), password);
      navigate(from.startsWith('/rider') && from !== '/rider/login' ? from : '/rider', { replace: true });
    } catch (err) {
      setError(riderErrorMessage(err));
      setBusy(false);
    }
  }

  const ended = !error && endReason
    ? (endReason === 'disabled' ? DISABLED_MESSAGE : 'You were signed out. Please sign in again.')
    : null;

  return (
    <div className={r.login}>
      <div className={r.loginCard}>
        <img src={logo} alt="City Bukka" />
        <h1>Rider sign in</h1>
        <p className={s.pageSub}>Your deliveries, customer contacts and directions.</p>
        <form className={r.loginForm} onSubmit={submit}>
          <ErrorBanner message={ended} />
          <ErrorBanner message={error} />
          <TextField
            label="Phone number"
            type="tel"
            inputMode="tel"
            autoComplete="username"
            placeholder="0803 123 4567"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="primary" busy={busy} style={{ minHeight: 52, fontSize: 17 }}>Sign in</Button>
        </form>
      </div>
    </div>
  );
}
