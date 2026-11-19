import { foodItems } from '../data/mockData';
import type { CartItem, CustomizationOption, FoodItem } from '../types';
import { formatNaira } from './format';
import { computeTotals, sameSelection } from './pricing';

const food = (id: string) => foodItems.find((f) => f.id === id)!;
const option = (f: FoodItem, id: string) =>
  f.customizationGroups.flatMap((g) => g.options).find((o) => o.id === id)!;

function line(foodId: string, quantity: number, optionIds: string[] = []): CartItem {
  const f = food(foodId);
  return { id: foodId, foodItem: f, quantity, selectedOptions: optionIds.map((o) => option(f, o)), specialInstructions: '' };
}

describe('computeTotals (matches Flutter CartRepository and the server)', () => {
  it('is all zeros for an empty cart', () => {
    expect(computeTotals([], 'BUKKA20').total).toBe(0);
  });

  it('adds delivery, service and packaging below the threshold', () => {
    expect(computeTotals([line('food_zobo', 1, ['zb_ice'])], null)).toEqual({
      itemCount: 1, subtotal: 1000, deliveryFee: 650, serviceFee: 200, packagingFee: 150, discount: 0, total: 2000,
    });
  });

  it('gives free delivery at ₦7,500+ and prices extras per unit', () => {
    // (3500 + 1200 goat + 500 dodo) × 2 = 10,400
    const t = computeTotals([line('food_jellof_rice', 2, ['p_goat', 'a_dodo'])], null);
    expect(t.subtotal).toBe(10400);
    expect(t.deliveryFee).toBe(0);
    expect(t.itemCount).toBe(2);
  });

  it('applies percentage and flat promo codes; ignores unknown codes', () => {
    const items = [line('food_fried_rice', 1, ['fr_chicken'])];
    expect(computeTotals(items, 'bukka20').discount).toBe(760);
    expect(computeTotals(items, 'HOTBUKKA').discount).toBe(500);
    expect(computeTotals(items, 'NOPE').discount).toBe(0);
  });
});

describe('helpers', () => {
  it('formats naira like the Flutter CurrencyFormatter', () => {
    expect(formatNaira(3500)).toBe('₦3,500');
    expect(formatNaira(1234567.5)).toBe('₦1,234,567.50');
    expect(formatNaira(0)).toBe('₦0');
  });

  it('compares option selections regardless of order', () => {
    const a: CustomizationOption = { id: 'a', name: 'A', extraPrice: 0 };
    const b: CustomizationOption = { id: 'b', name: 'B', extraPrice: 0 };
    expect(sameSelection([a, b], [b, a])).toBe(true);
    expect(sameSelection([a], [b])).toBe(false);
    expect(sameSelection([a], [a, b])).toBe(false);
  });
});
