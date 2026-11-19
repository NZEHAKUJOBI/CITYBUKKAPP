/** Mirrors CityBukka-MX lib/core/constants/app_constants.dart and CityBukka-Server src/config.js. */
export const APP = {
  name: 'CityBukka MX',
  tagline: 'Authentic Bukka Flavors, Delivered Hot',
  currencySymbol: '₦',
  grabAndGoPhones: ['08084867532', '07033846252'],
  supportPhone: '+234 800 BUKKA MX',
  supportEmail: 'help@citybukka.com',
} as const;

export const FEES = {
  standardDelivery: 650,
  service: 200,
  packaging: 150,
  freeDeliveryThreshold: 7500,
} as const;

/** value < 1 → fraction of subtotal; value >= 1 → flat naira amount off. */
export const PROMO_CODES: Readonly<Record<string, number>> = {
  BUKKA20: 0.2,
  FIRSTFEAST: 0.25,
  HOTBUKKA: 500,
};

export const PAYMENT_METHODS = [
  'CityPay Wallet',
  'Debit / Credit Card',
  'Bank Transfer',
  'Cash on Delivery',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
