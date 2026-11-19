import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { foodItems } from '../data/mockData';
import { CartProvider, useCart } from './CartContext';

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;
const jollof = foodItems.find((f) => f.id === 'food_jellof_rice')!;

beforeEach(() => localStorage.clear());

describe('CartContext', () => {
  it('auto-selects required options and merges identical lines', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem({ foodItem: jollof }));
    act(() => result.current.addItem({ foodItem: jollof }));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]!.quantity).toBe(2);
    expect(result.current.items[0]!.selectedOptions.map((o) => o.id)).toEqual(['p_chk']);
  });

  it('keeps different customisations as separate lines', () => {
    const goat = jollof.customizationGroups[0]!.options[1]!;
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem({ foodItem: jollof }));
    act(() => result.current.addItem({ foodItem: jollof, selectedOptions: [goat] }));
    expect(result.current.items).toHaveLength(2);
  });

  it('rejects unknown promo codes and removes lines at quantity 0', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem({ foodItem: jollof }));
    let ok = true;
    act(() => { ok = result.current.applyPromo('FREEFOOD'); });
    expect(ok).toBe(false);
    act(() => { ok = result.current.applyPromo(' bukka20 '); });
    expect(ok).toBe(true);
    expect(result.current.promoCode).toBe('BUKKA20');

    act(() => result.current.updateQuantity(result.current.items[0]!.id, 0));
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it('survives a reload (saved on the device)', () => {
    const first = renderHook(() => useCart(), { wrapper });
    act(() => first.result.current.addItem({ foodItem: jollof, quantity: 3 }));
    first.unmount();

    const second = renderHook(() => useCart(), { wrapper });
    expect(second.result.current.itemCount).toBe(3);
  });
});
