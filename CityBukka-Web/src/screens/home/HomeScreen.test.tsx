import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { APP } from '../../config/constants';
import { installFakeServer, resetClientState } from '../../test/fakeServer';
import { renderApp } from '../../test/render';

const renderHome = (initial = '/') => renderApp(initial);

afterEach(() => vi.unstubAllGlobals());

describe('HomeScreen', () => {
  beforeEach(() => {
    resetClientState();
    installFakeServer();
  });

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
    await waitFor(() => expect(screen.queryByRole('heading', { name: /Top Bukkas Near You/ })).not.toBeInTheDocument());
  });

  it('debounces search into ?q= and shows the reset empty state', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.type(await screen.findByRole('searchbox', { name: /Search dishes/ }), 'zzzz');
    expect(await screen.findByText('No Dishes Found', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/?q=zzzz');
    await user.click(screen.getByRole('button', { name: 'Reset Filters' }));
    expect(await screen.findByRole('heading', { name: /Trending Cravings/ })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  }, 15000);

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

  it('quick-adds a dish while signed out and claims the promo', async () => {
    const user = userEvent.setup();
    renderHome();
    const [addButton] = await screen.findAllByRole('button', { name: /^Add .* to bag$/ });
    await user.click(addButton!);
    expect(await screen.findByText(/added to your bag/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Claim' }));
    expect(await screen.findByText(/BUKKA20 copied & applied/)).toBeInTheDocument();
  });

  it('sends signed-out visitors to sign in when they tap a heart', async () => {
    const user = userEvent.setup();
    renderHome();
    const [heart] = await screen.findAllByRole('button', { name: /^Save / });
    await user.click(heart!);
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2F');
  });

  it('shows dishes without a photo with the branded placeholder (never a stock photo)', async () => {
    renderHome();
    await screen.findByRole('heading', { name: /Trending Cravings/ });
    expect(document.querySelectorAll('img[src*="unsplash"]').length).toBe(0);
    expect(document.querySelectorAll('[data-placeholder]').length).toBeGreaterThan(0);
  });
});

describe('HomeScreen with an empty menu', () => {
  beforeEach(() => {
    resetClientState();
    installFakeServer({ withCatalog: false });
  });

  it('shows the "menu is being prepared" state instead of empty sections', async () => {
    renderHome();
    expect(await screen.findByRole('heading', { name: 'Our menu is being prepared' })).toBeInTheDocument();
    expect(screen.getByText(/Check back soon/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Top Bukkas Near You/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Trending Cravings/ })).not.toBeInTheDocument();
  });
});

describe('HomeScreen offline', () => {
  beforeEach(() => {
    resetClientState();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  });

  it('shows a retryable error rather than demo data', async () => {
    renderHome();
    expect(await screen.findByRole('heading', { name: "Can't load the menu" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
