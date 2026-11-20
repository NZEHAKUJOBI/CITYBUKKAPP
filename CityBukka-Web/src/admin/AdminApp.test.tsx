import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import AdminApp from './AdminApp';
import { validateImageFile } from './adminApi';

const SESSION_KEY = 'citybukka:admin-session';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const STATS = {
  ordersToday: 3,
  revenueToday: 12500,
  activeOrders: 2,
  totalOrders: 40,
  restaurants: 5,
  foodItems: 30,
  categories: 6,
  users: 12,
  ordersByStatus: { placed: 1, preparing: 1, riderAssigned: 0, outForDelivery: 0, delivered: 37, cancelled: 1 },
  recentOrders: [],
};

function LocationProbe() {
  const loc = useLocation();
  return <output data-testid="location">{loc.pathname}</output>;
}

function renderAdmin(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

const futureSession = (token = 't0k3n') => JSON.stringify({
  token,
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  admin: { email: 'admin@citybukka.test', name: 'Ada Admin' },
});

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('admin login guard', () => {
  it('redirects to the login page when signed out', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderAdmin('/admin/orders');
    expect(await screen.findByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/login');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('treats an expired stored session as signed out', async () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      token: 'old', expiresAt: new Date(Date.now() - 1000).toISOString(), admin: { email: 'a@b.c', name: 'A' },
    }));
    renderAdmin('/admin/dashboard');
    expect(await screen.findByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument();
  });

  it('logs in, stores the token in sessionStorage and returns to the requested page', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/api/admin/login')) return json(JSON.parse(futureSession('fresh')));
      if (url.endsWith('/api/admin/stats')) return json(STATS);
      return json({ error: { code: 'not_found', message: 'nope' } }, 404);
    });
    renderAdmin('/admin/dashboard');

    await userEvent.type(await screen.findByLabelText('Email'), 'admin@citybukka.test');
    await userEvent.type(screen.getByLabelText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/dashboard');
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY)!).token).toBe('fresh');

    const statsCall = fetchSpy.mock.calls.find(([u]) => String(u).endsWith('/api/admin/stats'))!;
    expect(new Headers((statsCall[1] as RequestInit).headers).get('Authorization')).toBe('Bearer fresh');
    expect(await screen.findByText('₦12,500')).toBeInTheDocument();
  });

  it('shows the server error message on bad credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ error: { code: 'invalid_credentials', message: 'Invalid email or password' } }, 401),
    );
    renderAdmin('/admin/login');
    await userEvent.type(screen.getByLabelText('Email'), 'x@y.z');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Wrong email or password.')).toBeInTheDocument();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('explains login rate limiting using Retry-After', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ error: { code: 'rate_limited', message: 'Too many requests' } }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '30' } },
    ));
    renderAdmin('/admin/login');
    await userEvent.type(screen.getByLabelText('Email'), 'x@y.z');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Too many attempts. Try again in 30 s.')).toBeInTheDocument();
  });

  it('logs out automatically when the API answers 401', async () => {
    sessionStorage.setItem(SESSION_KEY, futureSession());
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json({ error: { code: 'unauthorized', message: 'Token expired' } }, 401));
    renderAdmin('/admin/dashboard');

    expect(await screen.findByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument();
    expect(screen.getByText(/session expired/i)).toBeInTheDocument();
    await waitFor(() => expect(sessionStorage.getItem(SESSION_KEY)).toBeNull());
  });

  it('logs out from the sidebar', async () => {
    sessionStorage.setItem(SESSION_KEY, futureSession());
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json(STATS));
    renderAdmin('/admin');
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(await screen.findByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

describe('validateImageFile', () => {
  it('accepts jpeg/png/webp up to 5 MB', () => {
    expect(validateImageFile({ type: 'image/webp', size: 5 * 1024 * 1024 })).toBeNull();
    expect(validateImageFile({ type: 'image/gif', size: 10 })).toMatch(/JPEG, PNG or WebP/);
    expect(validateImageFile({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/);
  });
});
