import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { loadRiderSession, onRiderSessionEnd, riderApi, saveRiderSession, type SessionEndReason } from './riderApi';
import type { RiderSession } from './types';

interface RiderAuthValue {
  session: RiderSession | null;
  login(phone: string, password: string): Promise<void>;
  logout(): void;
  /** Why the last session ended on its own (token rejected / account disabled). */
  endReason: SessionEndReason | null;
}

const RiderAuthContext = createContext<RiderAuthValue | null>(null);

export function RiderAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<RiderSession | null>(() => loadRiderSession());
  const [endReason, setEndReason] = useState<SessionEndReason | null>(null);

  const logout = useCallback(() => {
    saveRiderSession(null);
    setEndReason(null);
    setSession(null);
  }, []);

  useEffect(() => {
    onRiderSessionEnd((reason) => {
      setEndReason(reason);
      setSession(null);
    });
    return () => onRiderSessionEnd(null);
  }, []);

  // Sign out when the token's expiry passes while the app is open.
  useEffect(() => {
    if (!session?.expiresAt) return;
    const ms = Date.parse(session.expiresAt) - Date.now();
    if (Number.isNaN(ms)) return;
    const timer = setTimeout(() => {
      saveRiderSession(null);
      setEndReason('expired');
      setSession(null);
    }, Math.max(0, Math.min(ms, 2_147_483_647)));
    return () => clearTimeout(timer);
  }, [session]);

  const login = useCallback(async (phone: string, password: string) => {
    const result = await riderApi.login(phone, password);
    saveRiderSession(result);
    setEndReason(null);
    setSession(result);
  }, []);

  const value = useMemo(() => ({ session, login, logout, endReason }), [session, login, logout, endReason]);
  return <RiderAuthContext.Provider value={value}>{children}</RiderAuthContext.Provider>;
}

export function useRiderAuth(): RiderAuthValue {
  const ctx = useContext(RiderAuthContext);
  if (!ctx) throw new Error('useRiderAuth must be used inside <RiderAuthProvider>');
  return ctx;
}

export function RequireRider({ children }: { children: ReactNode }) {
  const { session } = useRiderAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/rider/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}
