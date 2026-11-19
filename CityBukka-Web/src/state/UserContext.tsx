import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { initialFavoriteFoodIds, initialFavoriteRestaurantIds, initialUser } from '../data/mockData';
import type { UserProfile } from '../types';
import { usePersistentState } from './persist';

interface UserContextValue {
  profile: UserProfile;
  updateProfile(changes: Partial<Omit<UserProfile, 'id' | 'loyaltyPoints'>>): void;
  favoriteFoodIds: string[];
  favoriteRestaurantIds: string[];
  isFoodFavorite(id: string): boolean;
  isRestaurantFavorite(id: string): boolean;
  toggleFoodFavorite(id: string): void;
  toggleRestaurantFavorite(id: string): void;
  isDarkMode: boolean;
  setDarkMode(dark: boolean): void;
}

const UserContext = createContext<UserContextValue | null>(null);

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = usePersistentState<UserProfile>('profile', initialUser);
  const [foodIds, setFoodIds] = usePersistentState<string[]>('favorites:food', initialFavoriteFoodIds);
  const [restIds, setRestIds] = usePersistentState<string[]>('favorites:restaurants', initialFavoriteRestaurantIds);

  // Theme is applied as a data attribute; CSS variables in theme.css do the rest.
  useEffect(() => {
    document.documentElement.dataset.theme = profile.isDarkMode ? 'dark' : 'light';
  }, [profile.isDarkMode]);

  const updateProfile = useCallback<UserContextValue['updateProfile']>(
    (changes) => setProfile((p) => ({ ...p, ...changes })), [setProfile]);
  const toggleFoodFavorite = useCallback((id: string) => setFoodIds((l) => toggle(l, id)), [setFoodIds]);
  const toggleRestaurantFavorite = useCallback((id: string) => setRestIds((l) => toggle(l, id)), [setRestIds]);
  const setDarkMode = useCallback((dark: boolean) => setProfile((p) => ({ ...p, isDarkMode: dark })), [setProfile]);

  const value = useMemo<UserContextValue>(() => ({
    profile,
    updateProfile,
    favoriteFoodIds: foodIds,
    favoriteRestaurantIds: restIds,
    isFoodFavorite: (id) => foodIds.includes(id),
    isRestaurantFavorite: (id) => restIds.includes(id),
    toggleFoodFavorite,
    toggleRestaurantFavorite,
    isDarkMode: profile.isDarkMode,
    setDarkMode,
  }), [profile, foodIds, restIds, updateProfile, toggleFoodFavorite, toggleRestaurantFavorite, setDarkMode]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}
