import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useEffect } from 'react';
import { useCart } from '../../state/CartContext';
import { foodItems, installFakeServer, resetClientState, signIn, testUser } from '../../test/fakeServer';
import { renderApp } from '../../test/render';

const jollof = foodItems.find((f) => f.id === 'food_jellof_rice')!;

function Seed() {
  const { addItem, items } = useCart();
  useEffect(() => {
    if (items.length === 0) addItem({ foodItem: jollof });
  }, []); // seed once
  return null;
}

const renderAt = (path: string, seed = true) => renderApp(path, seed ? <Seed /> : null);

let server: ReturnType<typeof installFakeServer>;
beforeEach(() => {
  resetClientState();
  server = installFakeServer();
});
afterEach(() => vi.unstubAllGlobals());

describe('CartScreen', () => {
  it('shows the empty state when the bag is empty (signed out is fine)', async () => {
    renderAt('/bag', false);
    expect(screen.getByText('Your Bukka Bag is Empty')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Explore Menu' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/));
  });

  it('rejects an invalid promo code and applies a valid one', async () => {
    renderAt('/bag');
    const input = await screen.findByLabelText('Promo code');
    fireEvent.change(input, { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid promo code');

    fireEvent.change(input, { target: { value: 'bukka20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByText(/Code BUKKA20 Applied/)).toBeInTheDocument();
    expect(screen.getByText('Bukka Promo Discount')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove promo code BUKKA20' }));
    expect(screen.queryByText('Bukka Promo Discount')).not.toBeInTheDocument();
  });

  it('never asks the server for a quote while signed out', async () => {
    renderAt('/bag');
    await screen.findByText('Bill Details');
    expect(server.state.requests.some((r) => r.path === '/api/cart/quote')).toBe(false);
  });

  it('clears the bag after confirmation', async () => {
    renderAt('/bag');
    fireEvent.click(await screen.findByRole('button', { name: 'Clear' }));
    const dialog = screen.getByRole('dialog', { name: 'Empty Bukka Bag?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('Your Bukka Bag is Empty')).toBeInTheDocument();
  });
});

describe('CheckoutScreen', () => {
  it('requires sign-in: signed-out checkout goes to /login?next=/checkout', async () => {
    renderAt('/bag');
    fireEvent.click(await screen.findByRole('button', { name: /Checkout \(1\)/ }));
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fcheckout');
  });

  it('redirects to the bag when the cart is empty', () => {
    signIn();
    renderAt('/checkout', false);
    expect(screen.getByText('Your Bukka Bag is Empty')).toBeInTheDocument();
  });

  it('posts deliveryAddress + contactPhone once, clears the bag and opens tracking', async () => {
    signIn(testUser({ phone: '08031234567', savedAddresses: ['12 Bosso Road, Minna'], selectedAddress: '12 Bosso Road, Minna' }));
    renderAt('/bag');
    fireEvent.click(await screen.findByRole('button', { name: /Checkout \(1\)/ }));

    expect(await screen.findByRole('radio', { name: /12 Bosso Road, Minna/ })).toBeChecked();
    const phone = screen.getByLabelText('Contact Phone');
    expect(phone).toHaveValue('08031234567');
    fireEvent.change(phone, { target: { value: '0905 555 1234' } });
    fireEvent.click(screen.getByRole('radio', { name: /Cash on Delivery/ }));

    const place = screen.getByRole('button', { name: /Place order/ });
    fireEvent.click(place);
    fireEvent.click(place);
    expect(await screen.findByText(/Track Order #CB-/)).toBeInTheDocument();

    const posts = server.state.requests.filter((r) => r.method === 'POST' && r.path === '/api/orders');
    expect(posts).toHaveLength(1);
    expect(posts[0]!.auth).toBe('Bearer test-token');
    expect(posts[0]!.body).toMatchObject({
      deliveryAddress: '12 Bosso Road, Minna',
      contactPhone: '0905 555 1234',
      paymentMethod: 'Cash on Delivery',
      items: [{ foodItemId: 'food_jellof_rice', quantity: 1, optionIds: ['p_chk'] }],
    });
    const cart = JSON.parse(localStorage.getItem('citybukka:cart:v2')!) as { items: unknown[] };
    expect(cart.items).toHaveLength(0);
  });

  it('collects an address when none is saved and shows server errors', async () => {
    const user = testUser({ savedAddresses: [], selectedAddress: null });
    server.state.user = user;
    signIn(user);
    server.state.overrides.set('POST /api/orders', () => new Response(
      JSON.stringify({ error: { code: 'conflict', message: 'Mama Ope Bukka Central is closed right now' } }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    ));
    renderAt('/bag');
    fireEvent.click(await screen.findByRole('button', { name: /Checkout \(1\)/ }));

    fireEvent.click(await screen.findByRole('button', { name: /Place order/ }));
    expect(await screen.findByText('Enter the address we should deliver to.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Delivery address'), { target: { value: '4 Paiko Road, Minna' } });
    fireEvent.click(screen.getByRole('button', { name: /Place order/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('closed right now');
  });
});
