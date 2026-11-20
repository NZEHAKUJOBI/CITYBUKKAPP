import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { PhoneShell, Splash, TabLayout } from './layout/layout';
import { CartScreen } from './screens/cart/CartScreen';
import { CheckoutScreen } from './screens/cart/CheckoutScreen';
import { DishDetailScreen } from './screens/dish/DishDetailScreen';
import { FavoritesScreen } from './screens/favorites/FavoritesScreen';
import { HomeScreen } from './screens/home/HomeScreen';
import { OrdersScreen } from './screens/orders/OrdersScreen';
import { OrderTrackingScreen } from './screens/orders/OrderTrackingScreen';
import { LoginScreen, RegisterScreen } from './screens/auth/AuthScreens';
import { ProfileScreen } from './screens/profile/ProfileScreen';
import { RestaurantDetailScreen } from './screens/restaurant/RestaurantDetailScreen';
import { AuthProvider, RequireAuth } from './state/AuthContext';
import { CartProvider } from './state/CartContext';
import { OrdersProvider } from './state/OrdersContext';
import { ToastProvider } from './state/ToastContext';
import { UserProvider } from './state/UserContext';

/** Staff back office – separate chunk, only downloaded when /admin is opened. */
const AdminApp = lazy(() => import('./admin/AdminApp'));
/** Rider app – separate chunk, only downloaded when /rider is opened. */
const RiderApp = lazy(() => import('./rider/RiderApp'));

/** Customer state. Must be rendered inside a router (auth redirects to /login on 401). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <UserProvider>
          <CartProvider>
            <OrdersProvider>{children}</OrdersProvider>
          </CartProvider>
        </UserProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

const guard = (element: ReactNode) => <RequireAuth>{element}</RequireAuth>;

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<TabLayout />}>
        <Route index element={<HomeScreen />} />
        <Route path="saved" element={guard(<FavoritesScreen />)} />
        <Route path="orders" element={guard(<OrdersScreen />)} />
        <Route path="bag" element={<CartScreen />} />
        <Route path="profile" element={guard(<ProfileScreen />)} />
      </Route>
      <Route path="login" element={<LoginScreen />} />
      <Route path="register" element={<RegisterScreen />} />
      <Route path="dish/:id" element={<DishDetailScreen />} />
      <Route path="restaurant/:id" element={<RestaurantDetailScreen />} />
      <Route path="checkout" element={guard(<CheckoutScreen />)} />
      <Route path="orders/:id" element={guard(<OrderTrackingScreen />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function CustomerApp() {
  return (
    <PhoneShell>
      <AppProviders>
        <Splash>
          <AppRoutes />
        </Splash>
      </AppProviders>
    </PhoneShell>
  );
}

function ChunkFallback({ label }: { label: string }) {
  return <div role="status" style={{ minHeight: '100vh', background: 'var(--bg, #071910)' }} aria-label={label} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin renders full-width, outside the customer phone frame. */}
        <Route
          path="admin/*"
          element={(
            <Suspense fallback={<ChunkFallback label="Loading admin" />}>
              <AdminApp />
            </Suspense>
          )}
        />
        {/* Rider app also renders outside the customer shell. */}
        <Route
          path="rider/*"
          element={(
            <Suspense fallback={<ChunkFallback label="Loading rider app" />}>
              <RiderApp />
            </Suspense>
          )}
        />
        <Route path="*" element={<CustomerApp />} />
      </Routes>
    </BrowserRouter>
  );
}