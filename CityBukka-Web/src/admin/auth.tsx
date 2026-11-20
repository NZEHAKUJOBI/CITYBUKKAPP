import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { adminApi, loadSession, onUnauthorized, saveSession } from './adminApi';
import type { AdminSession } from './types';

interface AdminAuthValue {
  session: AdminSession | null;
  login(email: string, password: string): Promise<void>;
  logout(): void;
  /** Set when the session ended because the server rejected the token. */
  expired: boolean;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(() => loadSession());
  const [expired, setExpired] = useState(false);

  const logout = useCallback(() => {
    saveSession(null);
    setSession(null);
  }, []);

  // Any 401 from the admin API → back to the login screen.
  useEffect(() => {
    onUnauthorized(() => {
      setExpired(true);
      setSession(null);
    });
    return () => onUnauthorized(null);
  }, []);

  // Log out when the token's expiry passes while the tab is open.
  useEffect(() => {
    if (!session?.expiresAt) return;
    const ms = Date.parse(session.expiresAt) - Date.now();
    if (Number.isNaN(ms)) return;
    const timer = setTimeout(() => {
      setExpired(true);
      logout();
    }, Math.max(0, Math.min(ms, 2_147_483_647)));
    return () => clearTimeout(timer);
  }, [session, logout]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await adminApi.login(email, password);
    saveSession(result);
    setExpired(false);
    setSession(result);
  }, []);

  const value = useMemo(() => ({ session, login, logout, expired }), [session, login, logout, expired]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  return ctx;
}

/** Redirects to /admin/login (remembering where the admin wanted to go) when signed out. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session } = useAdminAuth();
  const location = useLocation();
  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}
