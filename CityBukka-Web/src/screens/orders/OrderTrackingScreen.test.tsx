import { fireEvent, screen, within } from '@testing-library/react';
import type { Order } from '../../types';
import { installFakeServer, resetClientState, signIn } from '../../test/fakeServer';
import { renderApp } from '../../test/render';

const order = (over: Partial<Order>): Order => ({
  id: 'CB-111111', items: [], subtotal: 5000, deliveryFee: 650, serviceFee: 200, packagingFee: 150,
  discount: 0, total: 6000, status: 0, createdAt: '2026-11-19T10:30:00.000Z',
  deliveryAddress: '12 Government Road, GRA, Minna', contactPhone: '08031234567', paymentMethod: 'Cash on Delivery',
  rider: null, estimatedDeliveryMinutes: 35,
  ...over,
});

const ON_THE_WAY = order({
  id: 'CB-222222', status: 3,
  rider: { id: 'rider_1', name: 'Musa Rider', phone: '0809 555 0000', vehicle: 'Motorbike' },
});

let server: ReturnType<typeof installFakeServer>;
afterEach(() => vi.unstubAllGlobals());

describe('Orders', () => {
  beforeEach(() => {
    resetClientState();
    server = installFakeServer({ orders: [ON_THE_WAY, order({})] });
    signIn();
  });

  it('lists orders from the server and shows the assigned rider with a tap-to-call link', async () => {
    renderApp('/orders');
    fireEvent.click(await screen.findByRole('link', { name: 'Order #CB-222222' }));
    expect(await screen.findByText('Track Order #CB-222222')).toBeInTheDocument();
    expect(screen.getByText('Musa Rider')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Call Musa Rider' })).toHaveAttribute('href', 'tel:08095550000');
    expect(screen.getByText(/Contact: 0803 123 4567/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Simulate/ })).toBeNull();
  });

  it('shows a not-found state for unknown ids', async () => {
    renderApp('/orders/CB-000000');
    expect(await screen.findByText('Order Not Found')).toBeInTheDocument();
  });

  it('cancels a placed order via the API after confirmation', async () => {
    renderApp('/orders/CB-111111');
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));
    expect(screen.queryByRole('link', { name: /^Call / })).toBeNull();
    const dialog = screen.getByRole('dialog', { name: 'Cancel this order?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yes, cancel' }));

    expect(await screen.findByText('Order Cancelled')).toBeInTheDocument();
    expect(server.state.requests).toContainEqual(expect.objectContaining({ method: 'POST', path: '/api/orders/CB-111111/cancel' }));
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull();
    expect(screen.queryByText('Live Bukka Progress')).toBeNull();
  });

  it('polls an active order every 15 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderApp('/orders/CB-222222');
      expect(await screen.findByText('Track Order #CB-222222')).toBeInTheDocument();
      const count = () => server.state.requests.filter((r) => r.path === '/api/orders/CB-222222').length;
      const before = count();
      server.state.orders[0]!.status = 4;
      await vi.advanceTimersByTimeAsync(15_000);
      expect(count()).toBeGreaterThan(before);
      expect(await screen.findByText('Meal Delivered 🎉')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Orders auth', () => {
  beforeEach(() => {
    resetClientState();
    server = installFakeServer();
  });

  it('redirects signed-out visitors to /login with next=', async () => {
    renderApp('/orders/CB-111111');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Forders%2FCB-111111');
  });

  it('a 401 from the API clears the session and sends the customer to sign in', async () => {
    localStorage.setItem('citybukka:session', JSON.stringify({ token: 'expired', expiresAt: null, user: { id: 'u', name: 'X', phone: '08031234567', role: 'customer' } }));
    renderApp('/orders');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Forders');
    expect(localStorage.getItem('citybukka:session')).toBeNull();
  });
});
