import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AppProviders } from '../../App';
import { useCart } from '../../state/CartContext';
import type { CustomizationGroup } from '../../types';
import { installFakeServer, resetClientState } from '../../test/fakeServer';
import { DishDetailScreen } from './DishDetailScreen';
import { initialSelection, missingRequiredGroups, toggleOption } from './selection';

function BagProbe() {
  const { items } = useCart();
  return <p data-testid="bag">{items.map((i) => `${i.foodItem.id}x${i.quantity}:${i.selectedOptions.map((o) => o.id).join('+')}:${i.specialInstructions}`).join('|')}</p>;
}

function renderDish(id: string) {
  return render(
    <MemoryRouter initialEntries={['/', `/dish/${id}`]} initialIndex={1}>
      <AppProviders>
        <Routes>
          <Route path="/" element={<><p>Home page</p><BagProbe /></>} />
          <Route path="/dish/:id" element={<DishDetailScreen />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  resetClientState();
  installFakeServer();
});
afterEach(() => vi.unstubAllGlobals());

describe('DishDetailScreen', () => {
  it('updates the live price, caps add-ons and adds the configured line to the bag', async () => {
    const user = userEvent.setup();
    renderDish('food_jellof_rice');

    const add = await screen.findByRole('button', { name: /Add to Bag/ });
    expect(add).toHaveTextContent('₦3,500');

    await user.click(screen.getByRole('radio', { name: /Tender Bukka Goat Meat/ }));
    expect(add).toHaveTextContent('₦4,700');

    const addons = screen.getByRole('group', { name: /Delicious Add-ons/ });
    for (const name of [/Dodo/, /Moimoi/, /Egg/]) await user.click(within(addons).getByRole('checkbox', { name }));
    expect(within(addons).getByRole('checkbox', { name: /Coleslaw/ })).toBeDisabled();
    expect(add).toHaveTextContent('₦6,200');

    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(add).toHaveTextContent('₦12,400');

    await user.type(screen.getByLabelText('Special Instructions'), 'No onions');
    await user.click(add);

    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(screen.getByTestId('bag')).toHaveTextContent('food_jellof_ricex2:p_goat+a_dodo+a_moimoi+a_egg:No onions');
    expect(screen.getByText('Added Smoky Party Jellof Rice to your Bukka bag!')).toBeInTheDocument();
  });

  it('shows a not-found state for unknown dishes', async () => {
    renderDish('nope');
    expect(await screen.findByText('Dish not found')).toBeInTheDocument();
  });
});

describe('selection rules', () => {
  const group = (over: Partial<CustomizationGroup>): CustomizationGroup => ({
    id: 'g', name: 'G', isRequired: false, maxSelectable: 1,
    options: [{ id: 'a', name: 'A', extraPrice: 0 }, { id: 'b', name: 'B', extraPrice: 100 }],
    ...over,
  });

  it('lets optional single-choice groups be cleared but not required ones', () => {
    const opt = group({});
    let sel = toggleOption({ g: [] }, opt, 'a');
    expect(sel.g).toEqual(['a']);
    expect(toggleOption(sel, opt, 'b').g).toEqual(['b']);
    expect(toggleOption(sel, opt, 'a').g).toEqual([]);

    const req = group({ isRequired: true });
    sel = initialSelection([req]);
    expect(toggleOption(sel, req, 'a').g).toEqual(['a']);
  });

  it('reports required groups without a choice', () => {
    const req = group({ isRequired: true });
    expect(missingRequiredGroups([req], { g: [] })).toEqual([req]);
    expect(missingRequiredGroups([req], { g: ['b'] })).toEqual([]);
  });
});
