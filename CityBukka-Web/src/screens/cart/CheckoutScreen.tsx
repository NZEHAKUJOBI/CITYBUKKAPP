import { Banknote, CreditCard, Landmark, Wallet, Zap, type LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { PAYMENT_METHODS, type PaymentMethod } from '../../config/constants';
import { Screen } from '../../layout/layout';
import { formatNaira } from '../../lib/format';
import { useCart } from '../../state/CartContext';
import { useOrders } from '../../state/OrdersContext';
import { useToast } from '../../state/ToastContext';
import { useUser } from '../../state/UserContext';
import styles from './CheckoutScreen.module.css';

/** Labels the Flutter screen shows for its three built-in addresses. */
const ADDRESS_LABELS: Record<string, string> = {
  'Shiroro Road by Unity Block, Minna': 'Home (Shiroro Road, Minna)',
  '12 Government Road, GRA, Minna, Niger State': 'GRA Office (Minna)',
  'FUT Minna Bosso Campus Gate, Minna, Niger State': 'Campus Hub (Bosso)',
};

const PAYMENT_DETAILS: Record<PaymentMethod, { subtitle: string; Icon: LucideIcon }> = {
  'CityPay Wallet': { subtitle: 'Balance: ₦15,400.00 (Instant 1-Tap)', Icon: Wallet },
  'Debit / Credit Card': { subtitle: 'Mastercard, Visa, Verve', Icon: CreditCard },
  'Bank Transfer': { subtitle: 'Instant Account Number Generation', Icon: Landmark },
  'Cash on Delivery': { subtitle: 'Pay cash or POS upon food arrival', Icon: Banknote },
};

/** Port of CityBukka-MX ui/features/cart/views/checkout_screen.dart. */
export function CheckoutScreen() {
  const cart = useCart();
  const { profile } = useUser();
  const { placeOrder } = useOrders();
  const toast = useToast();
  const navigate = useNavigate();

  const addresses = profile.savedAddresses.length > 0 ? profile.savedAddresses : [profile.selectedAddress].filter(Boolean);
  const [address, setAddress] = useState(() =>
    addresses.includes(profile.selectedAddress) ? profile.selectedAddress : (addresses[0] ?? ''));
  const [payment, setPayment] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const [placing, setPlacing] = useState(false);
  // Synchronous guards: one against double taps, one so clearing the cart on
  // success doesn't trigger the empty-bag redirect before we reach tracking.
  const submitting = useRef(false);
  const placed = useRef(false);

  if (cart.items.length === 0 && !placed.current) {
    return <Navigate to="/bag" replace />;
  }

  const handlePlaceOrder = async () => {
    if (submitting.current || !address) return;
    submitting.current = true;
    setPlacing(true);
    try {
      const order = await placeOrder({
        items: cart.items,
        promoCode: cart.promoCode,
        deliveryAddress: address,
        paymentMethod: payment,
      });
      placed.current = true;
      cart.clear();
      toast(`Order ${order.id} placed successfully!`, 'success');
      navigate('/orders/' + order.id, { replace: true });
    } catch {
      toast('Could not place your order. Please try again.', 'error');
      submitting.current = false;
      setPlacing(false);
    }
  };

  return (
    <Screen header={<PageHeader title="Checkout" />}>
      <div className={styles.body}>
        <fieldset className={styles.group}>
          <legend className={styles.sectionTitle}>Delivery Address</legend>
          {addresses.map((a, i) => (
            <label key={a} className={`${styles.option} ${a === address ? styles.selected : ''}`}>
              <input
                type="radio"
                name="address"
                value={a}
                checked={a === address}
                onChange={() => setAddress(a)}
                className={styles.radio}
              />
              <span className={styles.optionText}>
                <span className={styles.optionTitle}>{ADDRESS_LABELS[a] ?? `Saved Address ${i + 1}`}</span>
                <span className={styles.optionSubtitle}>{a}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className={styles.eta}>
          <Zap size={24} className={styles.etaIcon} aria-hidden />
          <div>
            <p className={styles.etaTitle}>Instant Bukka Dispatch</p>
            <p className={styles.etaSubtitle}>Estimated Delivery in 25 - 35 minutes</p>
          </div>
        </div>

        <fieldset className={styles.group}>
          <legend className={styles.sectionTitle}>Payment Method</legend>
          {PAYMENT_METHODS.map((m) => {
            const { subtitle, Icon } = PAYMENT_DETAILS[m];
            return (
              <label key={m} className={`${styles.option} ${m === payment ? styles.selected : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value={m}
                  checked={m === payment}
                  onChange={() => setPayment(m)}
                  className={styles.radio}
                />
                <Icon size={22} className={styles.methodIcon} aria-hidden />
                <span className={styles.optionText}>
                  <span className={styles.optionTitle}>{m}</span>
                  <span className={styles.optionSubtitle}>{subtitle}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <section className={styles.summary} aria-labelledby="order-total-title">
          <h2 id="order-total-title" className={styles.summaryTitle}>Order Total</h2>
          <div className={styles.summaryRow}>
            <span className={styles.summaryCount}>{cart.itemCount} items</span>
            <span className={styles.summaryTotal}>{formatNaira(cart.total)}</span>
          </div>
        </section>

        <Button
          fullWidth
          height={54}
          loading={placing}
          aria-label={placing ? 'Confirming Order...' : undefined}
          onClick={handlePlaceOrder}
          className={styles.placeButton}
        >
          Confirm &amp; Pay {formatNaira(cart.total)}
        </Button>
      </div>
    </Screen>
  );
}
