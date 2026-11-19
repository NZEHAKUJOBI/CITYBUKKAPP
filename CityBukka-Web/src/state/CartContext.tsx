import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { computeTotals, isValidPromo, normalizePromo, sameSelection } from '../lib/pricing';
import type { CartItem, CartTotals, CustomizationOption, FoodItem } from '../types';
import { usePersistentState } from './persist';

interface CartState {
  items: CartItem[];
  promoCode: string | null;
}

export interface AddToCartInput {
  foodItem: FoodItem;
  quantity?: number;
  selectedOptions?: CustomizationOption[];
  specialInstructions?: string;
}

interface CartContextValue extends CartTotals {
  items: CartItem[];
  promoCode: string | null;
  addItem(input: AddToCartInput): void;
  updateQuantity(cartItemId: string, quantity: number): void;
  removeItem(cartItemId: string): void;
  clear(): void;
  /** Returns false for an unknown code. */
  applyPromo(code: string): boolean;
  removePromo(): void;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Default choice for required groups, so quick "Add" buttons produce a valid line. */
export function defaultOptions(food: FoodItem): CustomizationOption[] {
  return food.customizationGroups
    .filter((g) => g.isRequired && g.options.length > 0)
    .map((g) => g.options[0]!);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = usePersistentState<CartState>('cart', { items: [], promoCode: null });

  const addItem = useCallback((input: AddToCartInput) => {
    const selectedOptions = input.selectedOptions ?? defaultOptions(input.foodItem);
    const quantity = input.quantity ?? 1;
    setState((s) => {
      const i = s.items.findIndex((it) =>
        it.foodItem.id === input.foodItem.id &&
        sameSelection(it.selectedOptions, selectedOptions) &&
        it.specialInstructions === (input.specialInstructions ?? ''));
      if (i >= 0) {
        const items = s.items.slice();
        items[i] = { ...items[i]!, quantity: items[i]!.quantity + quantity };
        return { ...s, items };
      }
      const line: CartItem = {
        id: crypto.randomUUID(),
        foodItem: input.foodItem,
        quantity,
        selectedOptions,
        specialInstructions: input.specialInstructions ?? '',
      };
      return { ...s, items: [...s.items, line] };
    });
  }, [setState]);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setState((s) => ({
      ...s,
      items: quantity <= 0
        ? s.items.filter((i) => i.id !== id)
        : s.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
    }));
  }, [setState]);

  const removeItem = useCallback((id: string) => {
    setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
  }, [setState]);

  const clear = useCallback(() => setState({ items: [], promoCode: null }), [setState]);

  const applyPromo = useCallback((code: string) => {
    if (!isValidPromo(code)) return false;
    setState((s) => ({ ...s, promoCode: normalizePromo(code) }));
    return true;
  }, [setState]);

  const removePromo = useCallback(() => setState((s) => ({ ...s, promoCode: null })), [setState]);

  const value = useMemo<CartContextValue>(() => ({
    items: state.items,
    promoCode: state.promoCode,
    ...computeTotals(state.items, state.promoCode),
    addItem, updateQuantity, removeItem, clear, applyPromo, removePromo,
  }), [state, addItem, updateQuantity, removeItem, clear, applyPromo, removePromo]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
