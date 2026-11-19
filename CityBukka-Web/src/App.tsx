import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { PhoneShell, Splash, TabLayout } from './layout/layout';
import { CartScreen } from './screens/cart/CartScreen';
import { CheckoutScreen } from './screens/cart/CheckoutScreen';
import { DishDetailScreen } from './screens/dish/DishDetailScreen';
import { FavoritesScreen } from './screens/favorites/FavoritesScreen';
import { HomeScreen } from './screens/home/HomeScreen';
import { OrdersScreen } from './screens/orders/OrdersScreen';
import { OrderTrackingScreen } from './screens/orders/OrderTrackingScreen';
import { ProfileScreen } from './screens/profile/ProfileScreen';
import { RestaurantDetailScreen } from './screens/restaurant/RestaurantDetailScreen';
import { CartProvider } from './state/CartContext';
import { OrdersProvider } from './state/OrdersContext';
import { ToastProvider } from './state/ToastContext';
import { UserProvider } from './state/UserContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <CartProvider>
        <OrdersProvider>
          <ToastProvider>{children}</ToastProvider>
        </OrdersProvider>
      </CartProvider>
    </UserProvider>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<TabLayout />}>
        <Route index element={<HomeScreen />} />
        <Route path="saved" element={<FavoritesScreen />} />
        <Route path="orders" element={<OrdersScreen />} />
        <Route path="bag" element={<CartScreen />} />
        <Route path="profile" element={<ProfileScreen />} />
      </Route>
      <Route path="dish/:id" element={<DishDetailScreen />} />
      <Route path="restaurant/:id" element={<RestaurantDetailScreen />} />
      <Route path="checkout" element={<CheckoutScreen />} />
      <Route path="orders/:id" element={<OrderTrackingScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <PhoneShell>
        <AppProviders>
          <Splash>
            <AppRoutes />
          </Splash>
        </AppProviders>
      </PhoneShell>
    </BrowserRouter>
  );
}
