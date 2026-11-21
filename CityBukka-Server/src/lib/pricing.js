import { randomUUID } from 'node:crypto';
import { PRICING } from '../config.js';
import { ApiError } from './errors.js';

// All arithmetic is done in kobo (integers) to avoid floating-point drift,
// then converted back to naira (decimal numbers) for the API.
const toKobo = (naira) => Math.round(naira * 100);
const toNaira = (kobo) => kobo / 100;

/**
 * Turn client cart lines into priced CartItem snapshots, using catalogue prices only.
 *
 * @param {Array<{foodItemId: string, quantity: number, optionIds?: string[], specialInstructions?: string}>} lines
 * @param {(id: string) => object|null} getFoodItem  returns an app-shaped FoodItem (or null)
 * @param {(id: string) => object|null} getRestaurant
 */
export function buildCartItems(lines, getFoodItem, getRestaurant) {
  return lines.map((line, index) => {
    const where = `items.${index}`;
    const food = getFoodItem(line.foodItemId);
    if (!food) throw ApiError.badRequest(`${where}: unknown food item '${line.foodItemId}'`);
    if (food.isAvailable === false) throw ApiError.conflict(`'${food.name}' is currently unavailable`);

    const restaurant = getRestaurant(food.restaurantId);
    if (!restaurant || !restaurant.isOpen) {
      throw ApiError.conflict(`${restaurant?.name ?? 'The restaurant'} is closed right now`);
    }

    const selectedOptions = resolveOptions(food, line.optionIds ?? [], where);
    const { isAvailable, ...foodItem } = food;

    return {
      id: randomUUID(),
      foodItem,
      quantity: line.quantity,
      selectedOptions,
      specialInstructions: line.specialInstructions ?? '',
    };
  });
}

function resolveOptions(food, optionIds, where) {
  const unique = [...new Set(optionIds)];
  const selected = [];

  for (const group of food.customizationGroups) {
    const picked = group.options.filter((o) => unique.includes(o.id));
    if (group.isRequired && picked.length === 0) {
      throw ApiError.badRequest(`${where}: '${group.name}' requires a choice for ${food.name}`);
    }
    if (picked.length > group.maxSelectable) {
      throw ApiError.badRequest(
        `${where}: pick at most ${group.maxSelectable} for '${group.name}' on ${food.name}`,
      );
    }
    selected.push(...picked);
  }

  const known = new Set(selected.map((o) => o.id));
  const unknown = unique.filter((id) => !known.has(id));
  if (unknown.length) {
    throw ApiError.badRequest(`${where}: unknown option(s) for ${food.name}: ${unknown.join(', ')}`);
  }
  return selected;
}

export function normalizePromoCode(code) {
  return code ? code.trim().toUpperCase() : null;
}

/**
 * Pricing rules: free delivery at/above the threshold,
 * percentage promos apply to the subtotal, flat promos are capped at the subtotal.
 */
export function priceCart(cartItems, promoCode) {
  if (cartItems.length === 0) {
    return { subtotal: 0, deliveryFee: 0, serviceFee: 0, packagingFee: 0, discount: 0, total: 0, promoCode: null };
  }

  const subtotalK = cartItems.reduce((sum, item) => {
    const unitK = toKobo(item.foodItem.price) +
      item.selectedOptions.reduce((s, o) => s + toKobo(o.extraPrice), 0);
    return sum + unitK * item.quantity;
  }, 0);

  const deliveryK = subtotalK >= toKobo(PRICING.freeDeliveryThreshold) ? 0 : toKobo(PRICING.standardDeliveryFee);
  const serviceK = toKobo(PRICING.serviceFee);
  const packagingK = toKobo(PRICING.packagingFee);

  const code = normalizePromoCode(promoCode);
  let discountK = 0;
  if (code) {
    const value = PRICING.promoCodes[code];
    if (value === undefined) throw ApiError.badRequest(`Promo code '${code}' is not valid`);
    discountK = value < 1 ? Math.round(subtotalK * value) : Math.min(toKobo(value), subtotalK);
  }

  const totalK = Math.max(0, subtotalK + deliveryK + serviceK + packagingK - discountK);

  return {
    subtotal: toNaira(subtotalK),
    deliveryFee: toNaira(deliveryK),
    serviceFee: toNaira(serviceK),
    packagingFee: toNaira(packagingK),
    discount: toNaira(discountK),
    total: toNaira(totalK),
    promoCode: code,
  };
}
