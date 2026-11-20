import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { AppProviders, AppRoutes } from '../App';

export function LocationProbe() {
  const loc = useLocation();
  return <output data-testid="location">{loc.pathname + loc.search}</output>;
}

/** Full customer app (real route table + providers) at `path`. */
export function renderApp(path: string | string[], extra?: ReactNode) {
  const entries = Array.isArray(path) ? path : [path];
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <AppProviders>
        <AppRoutes />
        <LocationProbe />
        {extra}
      </AppProviders>
    </MemoryRouter>,
  );
}

/** A single element inside the providers (no route table). */
export function renderInProviders(ui: ReactNode, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        {ui}
        <LocationProbe />
      </AppProviders>
    </MemoryRouter>,
  );
}
