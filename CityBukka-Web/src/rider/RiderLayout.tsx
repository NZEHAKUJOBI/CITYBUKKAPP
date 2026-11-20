import { LogOut } from 'lucide-react';
import { useEffect } from 'react';
import { Outlet } from 'react-router';
import logo from '../assets/logo_transparent.png';
import { useLoad } from '../admin/useLoad';
import { useRiderAuth } from './auth';
import r from './rider.module.css';
import { riderApi, riderErrorMessage } from './riderApi';

export function RiderLayout() {
  const { session, logout } = useRiderAuth();
  const me = useLoad(() => riderApi.me(), [], riderErrorMessage);

  useEffect(() => {
    const prev = document.title;
    document.title = 'CityBukka Rider';
    return () => { document.title = prev; };
  }, []);

  const name = me.data?.user.name || session?.user.name || 'Rider';
  const vehicle = me.data?.rider
    ? [me.data.rider.vehicle, me.data.rider.plateNumber].filter(Boolean).join(' · ')
    : null;

  return (
    <>
      <header className={r.header}>
        <img src={logo} alt="" />
        <div className={r.who} data-testid="rider-identity">
          <strong>{name}</strong>
          <small>{vehicle || (me.loading ? 'Loading…' : 'CityBukka rider')}</small>
        </div>
        <button type="button" className={r.headerBtn} onClick={logout} aria-label="Log out" title="Log out">
          <LogOut size={20} aria-hidden />
        </button>
      </header>
      <main className={r.main}>
        <Outlet />
      </main>
    </>
  );
}
