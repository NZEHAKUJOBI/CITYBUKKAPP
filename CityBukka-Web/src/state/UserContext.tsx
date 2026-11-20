import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { errorMessage } from '../data/client';
import { customerApi, type FavoriteKind, type ProfileChanges } from '../data/customerApi';
import type { UserProfile } from '../types';
import { loginPath, useAuth } from './AuthContext';
import { load, save } from './persist';
import { useToast } from './ToastContext';

interface UserContextValue {
  /** The signed-in customer, or null while signed out. */
  profile: UserProfile | null;
  /** PATCH /api/me. Resolves with the updated profile; rejects with an ApiError. */
  updateProfile(changes: ProfileChanges): Promise<UserProfile>;
  /** GET /api/me. */
  refreshProfile(): Promise<void>;
  favoriteFoodIds: string[];
  favoriteRestaurantIds: string[];
  isFoodFavorite(id: string): boolean;
  isRestaurantFavorite(id: string): boolean;
  /** Signed out → sends the visitor to /login first. */
  toggleFoodFavorite(id: string): void;
  toggleRestaurantFavorite(id: string): void;
  isDarkMode: boolean;
  setDarkMode(dark: boolean): void;
}

const UserContext = createContext<UserContextValue | null>(null);

const THEME_KEY = 'theme:dark';

export function UserProvider({ children }: { children: ReactNode }) {
  const { user, setUser, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // ---- Theme: the account's preference when signed in, else this device's. ----
  const [localDark, setLocalDark] = useState<boolean>(() => load(THEME_KEY, true));
  const isDarkMode = user ? user.isDarkMode : localDark;

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  const updateProfile = useCallback(async (changes: ProfileChanges) => {
    const updated = await customerApi.updateMe(changes);
    setUser(updated);
    return updated;
  }, [setUser]);

  const refreshProfile = useCallback(async () => {
    const fresh = await customerApi.getMe();
    setUser(fresh);
  }, [setUser]);

  const setDarkMode = useCallback((dark: boolean) => {
    setLocalDark(dark);
    save(THEME_KEY, dark);
    if (!user) return;
    const previous = user.isDarkMode;
    setUser({ ...user, isDarkMode: dark });
    customerApi.updateMe({ isDarkMode: dark })
      .then(setUser)
      .catch(() => setUser({ ...user, isDarkMode: previous }));
  }, [user, setUser]);

  // ---- Favourites (server-side, optimistic with rollback). ----
  const [foodIds, setFoodIds] = useState<string[]>([]);
  const [restIds, setRestIds] = useState<string[]>([]);
  const userId = user?.id;

  useEffect(() => {
    setFoodIds([]);
    setRestIds([]);
    if (!userId) return;
    let cancelled = false;
    customerApi.getFavoriteIds()
      .then((ids) => {
        if (cancelled) return;
        setFoodIds(ids.foodIds);
        setRestIds(ids.restaurantIds);
      })
      .catch(() => { /* hearts just show as empty */ });
    return () => { cancelled = true; };
  }, [userId]);

  // Latest lists for the toggle callbacks without re-creating them on every change.
  const lists = useRef({ food: foodIds, restaurant: restIds });
  lists.current = { food: foodIds, restaurant: restIds };

  const here = location.pathname + location.search;
  const toggleFavorite = useCallback((kind: FavoriteKind, id: string) => {
    if (!isAuthenticated) {
      toast('Sign in to save your favourites.');
      navigate(loginPath(here));
      return;
    }
    const set = kind === 'food' ? setFoodIds : setRestIds;
    const on = !lists.current[kind].includes(id);
    set((l) => (on ? [...l, id] : l.filter((x) => x !== id)));
    customerApi.setFavorite(kind, id, on).catch((err: unknown) => {
      set((l) => (on ? l.filter((x) => x !== id) : (l.includes(id) ? l : [...l, id])));
      toast(errorMessage(err, "Couldn't update your saved items."), 'error');
    });
  }, [isAuthenticated, navigate, here, toast]);

  const toggleFoodFavorite = useCallback((id: string) => toggleFavorite('food', id), [toggleFavorite]);
  const toggleRestaurantFavorite = useCallback((id: string) => toggleFavorite('restaurant', id), [toggleFavorite]);

  const value = useMemo<UserContextValue>(() => ({
    profile: user,
    updateProfile,
    refreshProfile,
    favoriteFoodIds: foodIds,
    favoriteRestaurantIds: restIds,
    isFoodFavorite: (id) => foodIds.includes(id),
    isRestaurantFavorite: (id) => restIds.includes(id),
    toggleFoodFavorite,
    toggleRestaurantFavorite,
    isDarkMode,
    setDarkMode,
  }), [user, updateProfile, refreshProfile, foodIds, restIds, toggleFoodFavorite, toggleRestaurantFavorite, isDarkMode, setDarkMode]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}
