import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCartItems, priceCart } from '../src/lib/pricing.js';
import { getFood, getRestaurant } from './fixtures.js';
const build = (lines) => buildCartItems(lines, getFood, getRestaurant);

test('prices options and quantity from the catalogue', () => {
  // Jollof 3500 + goat 1200 + dodo 500 = 5200 × 2 = 10400 → free delivery
  const items = build([{ foodItemId: 'food_jellof_rice', quantity: 2, optionIds: ['p_goat', 'a_dodo'] }]);
  const p = priceCart(items, null);
  assert.equal(p.subtotal, 10400);
  assert.equal(p.deliveryFee, 0);
  assert.equal(p.total, 10400 + 200 + 150);
});

test('charges delivery below the free-delivery threshold', () => {
  const items = build([{ foodItemId: 'food_zobo', quantity: 1, optionIds: ['zb_ice'] }]);
  assert.deepEqual(priceCart(items, null), {
    subtotal: 1000, deliveryFee: 650, serviceFee: 200, packagingFee: 150, discount: 0, total: 2000, promoCode: null,
  });
});

test('percentage and flat promo codes, case-insensitive', () => {
  const items = build([{ foodItemId: 'food_fried_rice', quantity: 1, optionIds: ['fr_chicken'] }]);
  assert.equal(priceCart(items, 'bukka20').discount, 760); // 20% of 3800
  assert.equal(priceCart(items, ' HOTBUKKA ').discount, 500);
  assert.throws(() => priceCart(items, 'NOPE'), /not valid/);
});

test('flat promo never exceeds the subtotal', () => {
  const cheap = { ...getFood('food_zobo'), id: 'cheap', price: 300, customizationGroups: [] };
  const items = buildCartItems([{ foodItemId: 'cheap', quantity: 1 }], () => cheap, getRestaurant);
  assert.equal(priceCart(items, 'HOTBUKKA').discount, 300);
});

test('rejects missing required choices, unknown options and too many picks', () => {
  assert.throws(() => build([{ foodItemId: 'food_jellof_rice', quantity: 1 }]), /requires a choice/);
  assert.throws(() => build([{ foodItemId: 'food_zobo', quantity: 1, optionIds: ['zb_ice', 'p_goat'] }]), /unknown option/);
  assert.throws(() => build([{ foodItemId: 'food_jellof_rice', quantity: 1, optionIds: ['p_chk', 'p_goat'] }]), /at most 1/);
  assert.throws(() => build([{ foodItemId: 'nope', quantity: 1 }]), /unknown food item/);
});
