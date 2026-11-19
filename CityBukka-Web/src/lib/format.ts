import { APP } from '../config/constants';
import { OrderStatus, SpiceLevel } from '../types';

/** ₦3,500 or ₦3,500.50 – same output as the app's CurrencyFormatter. */
export function formatNaira(amount: number): string {
  const kobo = Math.round(amount * 100);
  const whole = Math.floor(kobo / 100);
  const fraction = kobo % 100;
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${APP.currencySymbol}${grouped}${fraction > 0 ? `.${fraction.toString().padStart(2, '0')}` : ''}`;
}

export const SPICE_LABELS: Record<SpiceLevel, string> = {
  [SpiceLevel.none]: 'Not Spicy',
  [SpiceLevel.mild]: 'Mild 🌿',
  [SpiceLevel.medium]: 'Medium 🌶️',
  [SpiceLevel.hot]: 'Hot 🌶️🌶️',
  [SpiceLevel.bukkaFire]: 'Bukka Fire 🔥🌶️',
};

export const ORDER_STATUS_INFO: Record<OrderStatus, { title: string; description: string; step: number }> = {
  [OrderStatus.placed]: { title: 'Order Confirmed', description: 'Your order has been sent to the Bukka kitchen.', step: 0 },
  [OrderStatus.preparing]: { title: 'Bukka Kitchen Sizzling', description: 'Fresh spices and sizzle underway!', step: 1 },
  [OrderStatus.riderAssigned]: { title: 'Rider Assigned', description: 'Your delivery partner is picking up your feast.', step: 2 },
  [OrderStatus.outForDelivery]: { title: 'Out for Delivery', description: 'Rider is on the way to your door.', step: 3 },
  [OrderStatus.delivered]: { title: 'Delivered & Savored', description: 'Order arrived. Enjoy your meal!', step: 4 },
  [OrderStatus.cancelled]: { title: 'Cancelled', description: 'This order was cancelled.', step: -1 },
};

export const isOrderActive = (status: OrderStatus) =>
  status !== OrderStatus.delivered && status !== OrderStatus.cancelled;

export const deliveryTimeLabel = (min: number, max: number) => `${min} - ${max} min`;
