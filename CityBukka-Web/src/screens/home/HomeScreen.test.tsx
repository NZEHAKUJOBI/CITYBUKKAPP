import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { AppProviders } from '../../App';
import { APP } from '../../config/constants';
import { HomeScreen } from './HomeScreen';

function LocationProbe() {
  const loc = useLocation();
  return <output data-testid="location">{loc.pathname + loc.search}</output>;
}

function renderHome(initial = '/') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AppProviders>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
        </Routes>
        <LocationProbe />
      </AppProviders>
    </MemoryRouter>,
  );
}

beforeEach(() => localStorage.clear());

describe('HomeScreen', () => {
  it('shows a loader, then the featured bukkas and trending dishes', async () => {
    renderHome();
    expect(screen.getByRole('progressbar', { name: 'Loading menu' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /Top Bukkas Near You/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Trending Cravings/ })).toBeInTheDocument();
  });

  it('keeps the category in the URL and hides featured bukkas', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(await screen.findByRole('button', { name: /Zobo & Kunu Drinks/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/?cat=cat_drinks');
    expect(screen.queryByRole('heading', { name: /Top Bukkas Near You/ })).not.toBeInTheDocument();
  });

  it('debounces search into ?q= and shows the reset empty state', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.type(await screen.findByRole('searchbox', { name: /Search dishes/ }), 'zzzz');
    expect(await screen.findByText('No Dishes Found')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/?q=zzzz');
    await user.click(screen.getByRole('button', { name: 'Reset Filters' }));
    expect(await screen.findByRole('heading', { name: /Trending Cravings/ })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it('restores the search text from the URL', async () => {
    renderHome('/?q=zzzz');
    expect(await screen.findByRole('searchbox', { name: /Search dishes/ })).toHaveValue('zzzz');
    expect(await screen.findByRole('heading', { name: /Search Results \(0\)/ })).toBeInTheDocument();
  });

  it('opens Grab & Go with tel: links and closes on Escape', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(await screen.findByRole('button', { name: /Grab & Go/ }));
    const dialog = screen.getByRole('dialog', { name: /Call for Fast Takeout/ });
    for (const phone of APP.grabAndGoPhones) {
      expect(within(dialog).getByRole('link', { name: new RegExp(phone) })).toHaveAttribute('href', `tel:${phone}`);
    }
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('quick-adds a dish and claims the promo with toasts', async () => {
    const user = userEvent.setup();
    renderHome();
    const [addButton] = await screen.findAllByRole('button', { name: /^Add .* to bag$/ });
    await user.click(addButton!);
    expect(await screen.findByText(/added to your bag/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Claim' }));
    expect(await screen.findByText(/BUKKA20 copied & applied/)).toBeInTheDocument();
  });
});
