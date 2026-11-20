import { Navigate, Route, Routes } from 'react-router';
import { AdminAuthProvider, RequireAdmin } from './auth';
import { AdminLayout } from './AdminLayout';
import CategoriesPage from './pages/CategoriesPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import MenuPage from './pages/MenuPage';
import OrdersPage from './pages/OrdersPage';
import RestaurantsPage from './pages/RestaurantsPage';
import RidersPage from './pages/RidersPage';
import UsersPage from './pages/UsersPage';
import { styles as s } from './ui';

/**
 * Staff back office, mounted by App.tsx at `/admin/*` outside the customer PhoneShell.
 * Loaded with React.lazy so customers never download it.
 */
export default function AdminApp() {
  return (
    <div className={s.root}>
      <AdminAuthProvider>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="riders" element={<RidersPage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="restaurants" element={<RestaurantsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Routes>
      </AdminAuthProvider>
    </div>
  );
}
