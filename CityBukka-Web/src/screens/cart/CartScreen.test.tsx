import { fireEvent, render, screen, within } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AppProviders } from '../../App';
import { foodItems } from '../../data/mockData';
import { useCart } from '../../state/CartContext';
import { CartScreen } from './CartScreen';
import { CheckoutScreen } from './CheckoutScreen';

const jollof = foodItems.find((f) => f.id === 'food_jellof_rice')!;

function Seed({ children }: { children: ReactNode }) {
  const { addItem, items } = useCart();
  useEffect(() => {
    if (items.length === 0) addItem({ foodItem: jollof });
  }, []); // seed once
  return <>{children}</>;
}

function renderAt(path: string, seed = true) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        {seed ? (
          <Seed>
            <AppRoutesForTest />
          </Seed>
        ) : <AppRoutesForTest />}
      </AppProviders>
    </MemoryRouter>,
  );
}

function AppRoutesForTest() {
  return (
    <Routes>
      <Route path="/" element={<p>Home</p>} />
      <Route path="/bag" element={<CartScreen />} />
      <Route path="/checkout" element={<CheckoutScreen />} />
      <Route path="/orders/:id" element={<p>Tracking</p>} />
    </Routes>
  );
}

beforeEach(() => localStorage.clear());

describe('CartScreen', () => {
  it('shows the empty state when the bag is empty', () => {
    renderAt('/bag', false);
    expect(screen.getByText('Your Bukka Bag is Empty')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Explore Menu' }));
    expect(screen.getByText('Home')).toBeInTheDocument();
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

  it('clears the bag after confirmation', async () => {
    renderAt('/bag');
    fireEvent.click(await screen.findByRole('button', { name: 'Clear' }));
    const dialog = screen.getByRole('dialog', { name: 'Empty Bukka Bag?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('Your Bukka Bag is Empty')).toBeInTheDocument();
  });
});

describe('CheckoutScreen', () => {
  it('redirects to the bag when the cart is empty', () => {
    renderAt('/checkout', false);
    expect(screen.getByText('Your Bukka Bag is Empty')).toBeInTheDocument();
  });

  it('places the order once and goes to tracking', async () => {
    renderAt('/bag');
    fireEvent.click(await screen.findByRole('button', { name: /Checkout \(1\)/ }));
    expect(screen.getByRole('radio', { name: /Home \(Shiroro Road, Minna\)/ })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: /Cash on Delivery/ }));

    const pay = screen.getByRole('button', { name: /Confirm & Pay/ });
    fireEvent.click(pay);
    fireEvent.click(pay);
    expect(await screen.findByText('Tracking', {}, { timeout: 3000 })).toBeInTheDocument();

    const orders = JSON.parse(localStorage.getItem('citybukka:orders')!) as { paymentMethod: string }[];
    expect(orders.filter((o) => o.paymentMethod === 'Cash on Delivery')).toHaveLength(1);
    const cart = JSON.parse(localStorage.getItem('citybukka:cart')!) as { items: unknown[] };
    expect(cart.items).toHaveLength(0);
  });
});
