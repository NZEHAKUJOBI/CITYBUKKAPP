import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Spinner } from '../components/Spinner';
import { ApiError, loadSession, onUnauthorized, saveSession, type CustomerSession } from '../data/client';
import { customerApi, type RegisterInput } from '../data/customerApi';
import type { UserProfile } from '../types';

type AuthStatus = 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: UserProfile | null;
  isAuthenticated: boolean;
  /** True right after the customer pressed "Log out" (guarded pages then go home, not to /login). */
  signedOut: boolean;
  login(phone: string, password: string): Promise<UserProfile>;
  register(input: RegisterInput): Promise<UserProfile>;
  logout(): void;
  /** Replace the cached user after a profile update (keeps the session token). */
  setUser(user: UserProfile): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Thrown by login() when a rider/staff account tries the customer sign-in. */
export class WrongAppError extends Error {
  constructor(role: string) {
    super(role === 'rider'
      ? 'This is a rider account — use the rider app at /rider'
      : 'This is a staff account — sign in to the back office at /admin');
    this.name = 'WrongAppError';
  }
}

/** Only allow same-app paths as a post-login destination (no //evil.example or absolute URLs). */
export function safeNext(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (/^\/(login|register)(\/|\?|$)/.test(next)) return fallback;
  return next;
}

export const loginPath = (next: string) => `/login?next=${encodeURIComponent(next)}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CustomerSession | null>(() => loadSession());
  const [signedOut, setSignedOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const here = useRef('');
  here.current = location.pathname + location.search;

  const commit = useCallback((next: CustomerSession | null) => {
    saveSession(next);
    setSession(next);
    if (next) setSignedOut(false);
  }, []);

  // Any 401 on a signed-in request: drop the session and send the customer to sign in.
  useEffect(() => {
    onUnauthorized(() => {
      setSession(null);
      navigate(loginPath(safeNext(here.current)), { replace: true });
    });
    return () => onUnauthorized(null);
  }, [navigate]);

  // Refresh the stored user once per load (also validates the token).
  const token = session?.token;
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    customerApi.authMe()
      .then((user) => {
        if (cancelled) return;
        const current = loadSession();
        if (current?.token === token) commit({ ...current, user });
      })
      .catch(() => { /* 401 is handled globally; offline keeps the cached user */ });
    return () => { cancelled = true; };
  }, [token, commit]);

  const login = useCallback(async (phone: string, password: string) => {
    const res = await customerApi.login(phone, password);
    if (res.user.role !== 'customer') throw new WrongAppError(res.user.role);
    commit({ token: res.token, expiresAt: res.expiresAt ?? null, user: res.user });
    return res.user;
  }, [commit]);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await customerApi.register(input);
    commit({ token: res.token, expiresAt: res.expiresAt ?? null, user: res.user });
    return res.user;
  }, [commit]);

  const logout = useCallback(() => {
    commit(null);
    setSignedOut(true);
  }, [commit]);

  const setUser = useCallback((user: UserProfile) => {
    const current = loadSession();
    if (current) commit({ ...current, user });
  }, [commit]);

  const value = useMemo<AuthContextValue>(() => ({
    status: session ? 'authenticated' : 'anonymous',
    user: session?.user ?? null,
    isAuthenticated: Boolean(session),
    signedOut,
    login, register, logout, setUser,
  }), [session, signedOut, login, register, logout, setUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Route guard: signed-out visitors are sent to /login?next=<this page>. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, signedOut } = useAuth();
  const location = useLocation();
  if (!isAuthenticated && signedOut) return <Navigate to="/" replace />;
  if (!isAuthenticated) return <Navigate to={loginPath(location.pathname + location.search)} replace />;
  return <>{children}</>;
}

/** Small full-area spinner for screens waiting on the API. */
export function LoadingScreen({ label }: { label: string }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}>
      <Spinner size={28} color="var(--accent)" label={label} />
    </div>
  );
}

export { ApiError };
