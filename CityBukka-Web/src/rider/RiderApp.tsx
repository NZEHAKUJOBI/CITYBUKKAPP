import { Navigate, Route, Routes } from 'react-router';
import { styles as adminStyles, cx } from '../admin/ui';
import { RequireRider, RiderAuthProvider } from './auth';
import DeliveriesPage from './pages/DeliveriesPage';
import OrderDetailPage from './pages/OrderDetailPage';
import RiderLoginPage from './pages/RiderLoginPage';
import r from './rider.module.css';
import { RiderLayout } from './RiderLayout';

/**
 * Rider app, mounted by App.tsx at `/rider/*` outside the customer shell (lazy-loaded).
 * Reuses the admin panel's themed UI primitives (buttons, dialogs, banners).
 */
export default function RiderApp() {
  return (
    <div className={cx(adminStyles.root, r.app)}>
      <RiderAuthProvider>
        <Routes>
          <Route path="login" element={<RiderLoginPage />} />
          <Route element={<RequireRider><RiderLayout /></RequireRider>}>
            <Route index element={<DeliveriesPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="*" element={<Navigate to="/rider" replace />} />
          </Route>
        </Routes>
      </RiderAuthProvider>
    </div>
  );
}
