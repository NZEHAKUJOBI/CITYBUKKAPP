import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import AdminApp from './AdminApp';
import type { AdminOrder, AdminRider } from './types';

const SESSION_KEY = 'citybukka:admin-session';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const RIDERS: AdminRider[] = [
  { id: 'rd1', name: 'Rita Rider', phone: '08031234567', vehicle: 'Motorbike', plateNumber: 'LSD 123 AB', isActive: true, activeOrders: 1, deliveredOrders: 12 },
  { id: 'rd2', name: 'Idle Ike', phone: '08035550000', vehicle: 'Bicycle', plateNumber: null, isActive: false, activeOrders: 0, deliveredOrders: 3 },
];

function adminOrder(overrides: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: 'CB-100001',
    items: [],
    subtotal: 5000,
    deliveryFee: 500,
    serviceFee: 100,
    packagingFee: 0,
    discount: 0,
    total: 5600,
    status: 1,
    createdAt: new Date().toISOString(),
    deliveryAddress: '5 Admiralty Way, Lekki',
    paymentMethod: 'Cash on Delivery',
    estimatedDeliveryMinutes: 30,
    customer: { id: 'u1', name: 'Chidi Okafor', phone: '08011112222' },
    contactPhone: '08099998888',
    rider: null,
    ...overrides,
  } as AdminOrder;
}

function renderAdmin(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    token: 't0k3n',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    admin: { email: 'admin@citybukka.test', name: 'Ada Admin' },
  }));
});

describe('admin order rider assignment', () => {
  it('replaces Advance with a rider picker for preparing orders and posts the assignment', async () => {
    const assigned = adminOrder({ status: 2, rider: { id: 'rd1', name: 'Rita Rider', phone: '08031234567', vehicle: 'Motorbike' } });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/api/admin/orders/CB-100001/assign')) return json(assigned);
      if (url.endsWith('/api/admin/orders/CB-100001')) return json(adminOrder());
      if (url.includes('/api/admin/orders')) return json({ items: [adminOrder()], total: 1 });
      if (url.endsWith('/api/admin/riders')) return json(RIDERS);
      return json({ error: { code: 'not_found', message: 'nope' } }, 404);
    });
    renderAdmin('/admin/orders?open=CB-100001');

    const drawer = await screen.findByRole('dialog', { name: 'Order CB-100001' });
    expect(await within(drawer).findByText(/Chidi Okafor/)).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: '08099998888' })).toHaveAttribute('href', 'tel:08099998888');
    expect(within(drawer).queryByRole('button', { name: 'Out for delivery' })).toBeNull();
    expect(within(drawer).getByText('Assign a rider to continue')).toBeInTheDocument();

    const select = await within(drawer).findByLabelText('Rider');
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(2)); // placeholder + 1 active rider
    expect(within(select).queryByText(/Idle Ike/)).toBeNull();
    await userEvent.selectOptions(select, 'rd1');
    await userEvent.click(within(drawer).getByRole('button', { name: 'Assign rider' }));

    const call = await waitFor(() => {
      const c = fetchSpy.mock.calls.find(([u]) => String(u).endsWith('/api/admin/orders/CB-100001/assign'));
      expect(c).toBeTruthy();
      return c!;
    });
    expect((call[1] as RequestInit).method).toBe('POST');
    expect(JSON.parse(String((call[1] as RequestInit).body))).toEqual({ riderId: 'rd1' });
    expect(await within(drawer).findByRole('button', { name: 'Unassign' })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Out for delivery' })).toBeInTheDocument();
  });

  it('unassigns a rider', async () => {
    const withRider = adminOrder({ status: 2, rider: { id: 'rd1', name: 'Rita Rider', phone: '08031234567', vehicle: 'Motorbike' } });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/unassign')) return json(adminOrder({ status: 1, rider: null }));
      if (url.endsWith('/api/admin/orders/CB-100001')) return json(withRider);
      if (url.includes('/api/admin/orders')) return json({ items: [withRider], total: 1 });
      if (url.endsWith('/api/admin/riders')) return json(RIDERS);
      return json({ error: { code: 'not_found', message: 'nope' } }, 404);
    });
    renderAdmin('/admin/orders?open=CB-100001');
    const drawer = await screen.findByRole('dialog', { name: 'Order CB-100001' });
    await userEvent.click(await within(drawer).findByRole('button', { name: 'Unassign' }));
    expect(await within(drawer).findByText('Not assigned')).toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([u, i]) => String(u).endsWith('/api/admin/orders/CB-100001/unassign')
      && (i as RequestInit).method === 'POST')).toBe(true);
  });

  it('shows the rider column in the orders list', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/admin/orders')) {
        return json({ items: [adminOrder({ id: 'CB-1', status: 2, rider: { id: 'rd1', name: 'Rita Rider', phone: '0803', vehicle: null } }), adminOrder({ id: 'CB-2' })], total: 2 });
      }
      return json([]);
    });
    renderAdmin('/admin/orders');
    expect(await screen.findByText('Rita Rider')).toBeInTheDocument();
    expect(screen.getByText('Needs rider')).toBeInTheDocument();
  });
});

describe('admin riders page', () => {
  it('lists riders with counts and creates one, showing phone_taken nicely', async () => {
    let attempts = 0;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/api/admin/riders') && init?.method === 'POST') {
        attempts += 1;
        if (attempts === 1) return json({ error: { code: 'phone_taken', message: 'Phone already registered' } }, 409);
        return json({ ...RIDERS[0], id: 'rd3', name: 'New Nnamdi', phone: '08030001111', activeOrders: 0, deliveredOrders: 0 }, 201);
      }
      if (url.endsWith('/api/admin/riders')) return json(RIDERS);
      return json({ error: { code: 'not_found', message: 'nope' } }, 404);
    });
    renderAdmin('/admin/riders');

    expect(await screen.findByText('Rita Rider')).toBeInTheDocument();
    expect(screen.getByText('LSD 123 AB')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Idle Ike active' })).not.toBeChecked();

    await userEvent.click(screen.getByRole('button', { name: /New rider/ }));
    const dialog = await screen.findByRole('dialog', { name: 'New rider' });
    await userEvent.type(within(dialog).getByLabelText('Full name'), 'New Nnamdi');
    await userEvent.type(within(dialog).getByLabelText('Phone'), '0803 000 1111');
    await userEvent.type(within(dialog).getByLabelText('Password'), 'longenough');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create rider' }));
    expect(await within(dialog).findByText('That phone number is already used by another account.')).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Create rider' }));
    expect(await screen.findByText('New Nnamdi')).toBeInTheDocument();
    const post = fetchSpy.mock.calls.filter(([u, i]) => String(u).endsWith('/api/admin/riders') && (i as RequestInit)?.method === 'POST')[1];
    expect(JSON.parse(String((post![1] as RequestInit).body))).toEqual({
      name: 'New Nnamdi', phone: '0803 000 1111', password: 'longenough', vehicle: 'Motorbike',
    });
  });

  it('explains why a rider with active orders cannot be deleted', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method === 'DELETE') return json({ error: { code: 'in_use', message: 'Rider has active orders' } }, 409);
      if (url.endsWith('/api/admin/riders')) return json(RIDERS);
      return json({ error: { code: 'not_found', message: 'nope' } }, 404);
    });
    renderAdmin('/admin/riders');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Rita Rider' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete rider' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await within(dialog).findByText(/still has active deliveries/)).toBeInTheDocument();
  });
});

describe('admin users role filter', () => {
  it('passes ?role= to the API and shows the role column', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('role=rider')) return json([{ id: 'u2', name: 'Rita Rider', email: '', phone: '0803', role: 'rider', orderCount: 0 }]);
      return json([{ id: 'u1', name: 'Chidi', email: 'c@x.y', phone: '0801', role: 'customer', orderCount: 2 }]);
    });
    renderAdmin('/admin/users');
    expect(await screen.findByText('Chidi')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Filter by role'), 'rider');
    expect(await screen.findByText('Rita Rider')).toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([u]) => String(u).endsWith('/api/admin/users?role=rider'))).toBe(true);
  });
});
