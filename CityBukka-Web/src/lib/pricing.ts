import { FEES, PROMO_CODES } from '../config/constants';
import type { CartItem, CartTotals, CustomizationOption } from '../types';

// Arithmetic in kobo (integers) so totals never drift; results are naira.
const k = (naira: number) => Math.round(naira * 100);

export const unitPrice = (item: Pick<CartItem, 'foodItem' | 'selectedOptions'>) =>
  (k(item.foodItem.price) + item.selectedOptions.reduce((s, o) => s + k(o.extraPrice), 0)) / 100;

export const lineTotal = (item: CartItem) => (k(unitPrice(item)) * item.quantity) / 100;

export const normalizePromo = (code: string) => code.trim().toUpperCase();
export const isValidPromo = (code: string) => normalizePromo(code) in PROMO_CODES;

/** Same rules as the app's CartRepository and the server's priceCart(). */
export function computeTotals(items: CartItem[], promoCode: string | null): CartTotals {
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);
  if (items.length === 0) {
    return { itemCount: 0, subtotal: 0, deliveryFee: 0, serviceFee: 0, packagingFee: 0, discount: 0, total: 0 };
  }
  const subtotal = items.reduce((s, i) => s + k(lineTotal(i)), 0);
  const delivery = subtotal >= k(FEES.freeDeliveryThreshold) ? 0 : k(FEES.standardDelivery);
  const service = k(FEES.service);
  const packaging = k(FEES.packaging);

  let discount = 0;
  const promo = promoCode ? PROMO_CODES[normalizePromo(promoCode)] : undefined;
  if (promo !== undefined) {
    discount = promo < 1 ? Math.round(subtotal * promo) : Math.min(k(promo), subtotal);
  }

  return {
    itemCount,
    subtotal: subtotal / 100,
    deliveryFee: delivery / 100,
    serviceFee: service / 100,
    packagingFee: packaging / 100,
    discount: discount / 100,
    total: Math.max(0, subtotal + delivery + service + packaging - discount) / 100,
  };
}

/** Two cart lines merge when they are the same dish with the same set of options. */
export function sameSelection(a: CustomizationOption[], b: CustomizationOption[]) {
  if (a.length !== b.length) return false;
  const ids = new Set(a.map((o) => o.id));
  return b.every((o) => ids.has(o.id));
}
