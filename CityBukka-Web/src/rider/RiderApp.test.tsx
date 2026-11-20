import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import RiderApp from './RiderApp';
import type { RiderOrder } from './types';

const SESSION_KEY = 'citybukka:rider-session';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const RIDER_USER = { id: 'u_r1', name: 'Rita Rider', phone: '08031234567', email: null, role: 'rider' };
const ME = { user: RIDER_USER, rider: { vehicle: 'Motorbike', plateNumber: 'LSD 123 AB', isActive: true } };

const session = (token = 'r1d3r') => JSON.stringify({
  token,
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  user: RIDER_USER,
});

function order(overrides: Partial<RiderOrder> = {}): RiderOrder {
  return {
    id: 'CB-123456',
    items: [{
      id: 'ci1',
      quantity: 2,
      specialInstructions: 'Extra pepper',
      selectedOptions: [{ id: 'o1', name: 'Large', extraPrice: 500 }],
      foodItem: {
        id: 'f1', restaurantId: 'r1', name: 'Jollof Rice', description: '', price: 2500, imageUrl: '', categoryId: 'c1',
        spiceLevel: 2, rating: 4.5, reviewCount: 1, calories: 0, prepTimeMinutes: 10, isPopular: false,
        isChefSpecial: false, isVegetarian: false, customizationGroups: [],
      },
    }],
    subtotal: 6000,
    deliveryFee: 800,
    serviceFee: 200,
    packagingFee: 0,
    discount: 0,
    total: 7000,
    status: 2,
    createdAt: new Date().toISOString(),
    deliveryAddress: '12 Allen Avenue, Ikeja, Lagos',
    contactPhone: '08099998888',
    paymentMethod: 'Cash on Delivery',
    customer: { name: 'Chidi Okafor', phone: '08011112222' },
    ...overrides,
  };
}

function LocationProbe() {
  const loc = useLocation();
  return <output data-testid="location">{loc.pathname}</output>;
}

function renderRider(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/rider/*" element={<RiderApp />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

type Handler = (url: string, init: RequestInit | undefined) => Response | undefined;

function mockApi(handler: Handler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.endsWith('/api/rider/me')) return json(ME);
    return handler(url, init) ?? json({ error: { code: 'not_found', message: 'nope' } }, 404);
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('rider login', () => {
  it('redirects to login when signed out', async () => {
    renderRider('/rider');
    expect(await screen.findByRole('heading', { name: 'Rider sign in' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/rider/login');
  });

  it('rejects accounts whose role is not rider and does not sign in', async () => {
    const fetchSpy = mockApi((url) => (url.endsWith('/api/auth/login')
      ? json({ token: 'cust', expiresAt: new Date(Date.now() + 3_600_000).toISOString(), user: { ...RIDER_USER, role: 'customer' } })
      : undefined));
    renderRider('/rider/login');
    await userEvent.type(screen.getByLabelText('Phone number'), '08031234567');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText("This account isn't a rider account")).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(screen.getByTestId('location')).toHaveTextContent('/rider/login');
    const loginCall = fetchSpy.mock.calls.find(([u]) => String(u).endsWith('/api/auth/login'))!;
    expect(JSON.parse(String((loginCall[1] as RequestInit).body))).toEqual({ phone: '08031234567', password: 'secret123' });
  });

  it('signs a rider in, keeps the token in localStorage and lists active deliveries', async () => {
    const fetchSpy = mockApi((url) => {
      if (url.endsWith('/api/auth/login')) return json(JSON.parse(session('fresh')));
      if (url.includes('/api/rider/orders?scope=active')) return json([order()]);
      return undefined;
    });
    renderRider('/rider/login');
    await userEvent.type(screen.getByLabelText('Phone number'), '08031234567');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const card = await screen.findByRole('link', { name: 'Order CB-123456' });
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!).token).toBe('fresh');
    expect(within(card).getByText('Chidi Okafor')).toBeInTheDocument();
    expect(within(card).getByText('12 Allen Avenue, Ikeja, Lagos')).toBeInTheDocument();
    expect(within(card).getByText('2 items', { exact: false })).toBeInTheDocument();
    expect(within(card).getByText('Collect ₦7,000 cash')).toBeInTheDocument();
    expect(await screen.findByText('Motorbike · LSD 123 AB')).toBeInTheDocument();

    const listCall = fetchSpy.mock.calls.find(([u]) => String(u).includes('/api/rider/orders'))!;
    expect(new Headers((listCall[1] as RequestInit).headers).get('Authorization')).toBe('Bearer fresh');
  });

  it('explains a disabled account at sign in', async () => {
    mockApi((url) => (url.endsWith('/api/auth/login')
      ? json({ error: { code: 'account_disabled', message: 'Account disabled' } }, 403)
      : undefined));
    renderRider('/rider/login');
    await userEvent.type(screen.getByLabelText('Phone number'), '08031234567');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Your rider account is disabled, contact admin')).toBeInTheDocument();
  });

  it('goes back to login on 401', async () => {
    localStorage.setItem(SESSION_KEY, session());
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json({ error: { code: 'unauthorized', message: 'expired' } }, 401));
    renderRider('/rider');
    expect(await screen.findByRole('heading', { name: 'Rider sign in' })).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem(SESSION_KEY)).toBeNull());
  });

  it('signs out with a message when the account is disabled mid-shift', async () => {
    localStorage.setItem(SESSION_KEY, session());
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      json({ error: { code: 'account_disabled', message: 'Account disabled' } }, 403));
    renderRider('/rider');
    expect(await screen.findByText('Your rider account is disabled, contact admin')).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

describe('rider deliveries', () => {
  it('switches to the completed tab', async () => {
    localStorage.setItem(SESSION_KEY, session());
    const fetchSpy = mockApi((url) => {
      if (url.includes('scope=active')) return json([]);
      if (url.includes('scope=completed')) return json([order({ id: 'CB-999999', status: 4 })]);
      return undefined;
    });
    renderRider('/rider');
    expect(await screen.findByText(/No active deliveries/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Completed' }));
    const card = await screen.findByRole('link', { name: 'Order CB-999999' });
    expect(within(card).getByText('Delivered')).toBeInTheDocument();
    expect(within(card).queryByText(/Collect/)).toBeNull();
    expect(fetchSpy.mock.calls.some(([u]) => String(u).includes('scope=completed'))).toBe(true);
  });
});

describe('rider order detail', () => {
  it('shows tap-to-call links for both numbers and a Google Maps link', async () => {
    localStorage.setItem(SESSION_KEY, session());
    mockApi((url) => (url.endsWith('/api/rider/orders/CB-123456') ? json(order()) : undefined));
    renderRider('/rider/orders/CB-123456');

    const contact = await screen.findByRole('link', { name: /Call 08099998888/ });
    expect(contact).toHaveAttribute('href', 'tel:08099998888');
    expect(screen.getByRole('link', { name: /Call 08011112222/ })).toHaveAttribute('href', 'tel:08011112222');

    const maps = screen.getByRole('link', { name: /Open in Maps/ });
    expect(maps).toHaveAttribute(
      'href',
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('12 Allen Avenue, Ikeja, Lagos')}`,
    );
    expect(screen.getByText('Large')).toBeInTheDocument();
    expect(screen.getByText('“Extra pepper”')).toBeInTheDocument();
    expect(screen.getByText('Collect ₦7,000 cash')).toBeInTheDocument();
  });

  it('shows a single call button when the contact phone matches the account phone', async () => {
    localStorage.setItem(SESSION_KEY, session());
    mockApi((url) => (url.endsWith('/api/rider/orders/CB-123456')
      ? json(order({ contactPhone: '0801 111 2222' }))
      : undefined));
    renderRider('/rider/orders/CB-123456');
    expect(await screen.findAllByRole('link', { name: /^Call / })).toHaveLength(1);
  });

  it('offers pickup when a rider is assigned and posts it', async () => {
    localStorage.setItem(SESSION_KEY, session());
    const fetchSpy = mockApi((url, init) => {
      if (url.endsWith('/pickup') && init?.method === 'POST') return json(order({ status: 3 }));
      if (url.endsWith('/api/rider/orders/CB-123456')) return json(order({ status: 2 }));
      return undefined;
    });
    renderRider('/rider/orders/CB-123456');

    await userEvent.click(await screen.findByRole('button', { name: /Picked up — start delivery/ }));
    expect(await screen.findByRole('button', { name: /Mark delivered/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Picked up/ })).toBeNull();
    expect(fetchSpy.mock.calls.some(([u, i]) => String(u).endsWith('/api/rider/orders/CB-123456/pickup')
      && (i as RequestInit).method === 'POST')).toBe(true);
  });

  it('confirms before marking delivered, then hides the actions', async () => {
    localStorage.setItem(SESSION_KEY, session());
    const fetchSpy = mockApi((url, init) => {
      if (url.endsWith('/deliver') && init?.method === 'POST') return json(order({ status: 4 }));
      if (url.endsWith('/api/rider/orders/CB-123456')) return json(order({ status: 3 }));
      return undefined;
    });
    renderRider('/rider/orders/CB-123456');

    expect(await screen.findByRole('button', { name: /Mark delivered/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Picked up/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Mark delivered/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Mark as delivered?' });
    expect(fetchSpy.mock.calls.some(([u]) => String(u).endsWith('/deliver'))).toBe(false);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, delivered' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: /Mark delivered/ })).toBeNull());
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('shows the 409 message when the order already moved on', async () => {
    localStorage.setItem(SESSION_KEY, session());
    mockApi((url, init) => {
      if (url.endsWith('/pickup') && init?.method === 'POST') {
        return json({ error: { code: 'invalid_status', message: 'Order is no longer waiting for pickup' } }, 409);
      }
      if (url.endsWith('/api/rider/orders/CB-123456')) return json(order({ status: 2 }));
      return undefined;
    });
    renderRider('/rider/orders/CB-123456');
    await userEvent.click(await screen.findByRole('button', { name: /Picked up/ }));
    expect(await screen.findByText('Order is no longer waiting for pickup')).toBeInTheDocument();
  });

  it('shows no actions for delivered orders', async () => {
    localStorage.setItem(SESSION_KEY, session());
    mockApi((url) => (url.endsWith('/api/rider/orders/CB-123456') ? json(order({ status: 4 })) : undefined));
    renderRider('/rider/orders/CB-123456');
    expect(await screen.findByText('Chidi Okafor')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Picked up/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Mark delivered/ })).toBeNull();
    expect(screen.queryByText(/Collect/)).toBeNull();
  });
});
