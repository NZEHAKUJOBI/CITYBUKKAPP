import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AppProviders } from '../../App';
import { installFakeServer, resetClientState } from '../../test/fakeServer';
import { foodItems, restaurants } from '../../test/fixtures';
import { RestaurantDetailScreen } from './RestaurantDetailScreen';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <Routes>
          <Route path="/restaurant/:id" element={<RestaurantDetailScreen />} />
          <Route path="/dish/:id" element={<p>Dish page</p>} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  );
}

let server: ReturnType<typeof installFakeServer>;
beforeEach(() => {
  resetClientState();
  server = installFakeServer();
});
afterEach(() => vi.unstubAllGlobals());

describe('RestaurantDetailScreen', () => {
  it('shows the restaurant and its menu, and opens a dish', async () => {
    const user = userEvent.setup();
    const menu = foodItems.filter((f) => f.restaurantId === 'rest_mama_ope');
    renderAt('/restaurant/rest_mama_ope');

    expect(await screen.findByRole('heading', { level: 1, name: restaurants.find((r) => r.id === 'rest_mama_ope')!.name })).toBeInTheDocument();
    expect(await screen.findByText(`${menu.length} items`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: `Add ${menu[0]!.name} to bag` }));
    expect(await screen.findByText('Dish page')).toBeInTheDocument();
  });

  it('shows a not-found state', async () => {
    renderAt('/restaurant/unknown');
    expect(await screen.findByText('Bukka not found')).toBeInTheDocument();
  });

  it('shows a "menu coming soon" state for a bukka without dishes', async () => {
    server.state.foods = server.state.foods.filter((f) => f.restaurantId !== 'rest_mama_ope');
    renderAt('/restaurant/rest_mama_ope');
    expect(await screen.findByRole('heading', { name: 'Menu coming soon' })).toBeInTheDocument();
  });
});
