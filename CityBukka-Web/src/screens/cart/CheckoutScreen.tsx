import { Banknote, CreditCard, Landmark, MapPin, PenLine, ShieldCheck, Wallet, Zap, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { catalog } from '../../data/api';
import { errorMessage } from '../../data/client';
import { customerApi, toOrderLine, type Quote } from '../../data/customerApi';
import { Screen } from '../../layout/layout';
import { deliveryTimeLabel, formatNaira } from '../../lib/format';
import { isValidNigerianPhone, PHONE_HINT } from '../../lib/phone';
import { lineTotal } from '../../lib/pricing';
import { useCart } from '../../state/CartContext';
import { useOrders } from '../../state/OrdersContext';
import { useToast } from '../../state/ToastContext';
import { useMeta } from '../../state/useMeta';
import { useUser } from '../../state/UserContext';
import page from '../../styles/page.module.css';
import styles from './CheckoutScreen.module.css';

const PAYMENT_DETAILS: Record<string, { subtitle: string; Icon: LucideIcon }> = {
  'CityPay Wallet': { subtitle: 'Pay from your CityPay wallet', Icon: Wallet },
  'Debit / Credit Card': { subtitle: 'Mastercard, Visa, Verve', Icon: CreditCard },
  'Bank Transfer': { subtitle: 'Transfer when your order is confirmed', Icon: Landmark },
  'Cash on Delivery': { subtitle: 'Pay cash or POS when your food arrives', Icon: Banknote },
};

const OTHER = '__other__';
const MIN_ADDRESS = 3;

/** Port of CityBukka-MX checkout_screen.dart, now placing real orders via POST /api/orders. */
export function CheckoutScreen() {
  const cart = useCart();
  const { profile } = useUser();
  const { placeOrder } = useOrders();
  const { paymentMethods } = useMeta();
  const toast = useToast();
  const navigate = useNavigate();
  const ids = useId();

  const saved = profile?.savedAddresses ?? [];
  const [choice, setChoice] = useState<string>(() => {
    const selected = profile?.selectedAddress;
    if (selected && saved.includes(selected)) return selected;
    return saved[0] ?? OTHER;
  });
  const [otherAddress, setOtherAddress] = useState(() =>
    (profile?.selectedAddress && !saved.includes(profile.selectedAddress) ? profile.selectedAddress : ''));
  const [contactPhone, setContactPhone] = useState(profile?.phone ?? '');
  const [payment, setPayment] = useState<string>(paymentMethods[0] ?? 'Cash on Delivery');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ address?: string; phone?: string }>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  // Synchronous guards: one against double taps, one so clearing the cart on
  // success doesn't trigger the empty-bag redirect before we reach tracking.
  const submitting = useRef(false);
  const placed = useRef(false);

  // Keep the selected payment method valid once /api/meta answers.
  useEffect(() => {
    if (paymentMethods.length > 0 && !paymentMethods.includes(payment)) setPayment(paymentMethods[0]!);
  }, [paymentMethods, payment]);

  // Server-side price check (authoritative totals, validates the promo and availability).
  const quoteKey = JSON.stringify([cart.items.map(toOrderLine), cart.promoCode]);
  useEffect(() => {
    if (cart.items.length === 0) return;
    let alive = true;
    customerApi.quote(cart.items.map(toOrderLine), cart.promoCode ?? undefined)
      .then((q) => { if (alive) setQuote(q); })
      .catch(() => { if (alive) setQuote(null); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  const eta = useMemo(() => {
    const rs = [...new Set(cart.items.map((i) => i.foodItem.restaurantId))]
      .map(catalog.restaurantById)
      .filter((r) => r !== null);
    if (rs.length === 0) return null;
    return deliveryTimeLabel(Math.max(...rs.map((r) => r.deliveryTimeMin)), Math.max(...rs.map((r) => r.deliveryTimeMax)));
  }, [cart.items]);

  if (cart.items.length === 0 && !placed.current) {
    return <Navigate to="/bag" replace />;
  }

  const address = (choice === OTHER ? otherAddress : choice).trim();
  const total = quote?.total ?? cart.total;

  const handlePlaceOrder = async (e?: FormEvent) => {
    e?.preventDefault();
    if (submitting.current) return;
    const found: typeof fieldErrors = {};
    if (address.length < MIN_ADDRESS) found.address = 'Enter the address we should deliver to.';
    if (!isValidNigerianPhone(contactPhone)) found.phone = `Enter a valid phone number (${PHONE_HINT}).`;
    setFieldErrors(found);
    if (Object.keys(found).length > 0) return;

    submitting.current = true;
    setPlacing(true);
    setError(null);
    try {
      const order = await placeOrder({
        items: cart.items,
        promoCode: cart.promoCode,
        deliveryAddress: address,
        contactPhone: contactPhone.trim(),
        paymentMethod: payment,
      });
      placed.current = true;
      cart.clear();
      toast(`Order ${order.id} placed successfully!`, 'success');
      navigate('/orders/' + order.id, { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not place your order. Please try again.'));
      submitting.current = false;
      setPlacing(false);
    }
  };

  return (
    <Screen header={<PageHeader title="Checkout" />}>
      <form className={styles.body} onSubmit={handlePlaceOrder} noValidate>
        <div className={styles.mainCol}>
          <fieldset className={styles.group} aria-describedby={fieldErrors.address ? `${ids}-address-error` : undefined}>
            <legend className={styles.sectionTitle}>Delivery Address</legend>
            {saved.map((a, i) => (
              <label key={a} className={`${styles.option} ${a === choice ? styles.selected : ''}`}>
                <input
                  type="radio"
                  name="address"
                  value={a}
                  checked={a === choice}
                  onChange={() => setChoice(a)}
                  className={styles.radio}
                />
                <MapPin size={20} className={styles.methodIcon} aria-hidden />
                <span className={styles.optionText}>
                  <span className={styles.optionTitle}>{a === profile?.selectedAddress ? 'Default address' : `Saved address ${i + 1}`}</span>
                  <span className={styles.optionSubtitle}>{a}</span>
                </span>
              </label>
            ))}
            {saved.length > 0 && (
              <label className={`${styles.option} ${choice === OTHER ? styles.selected : ''}`}>
                <input
                  type="radio"
                  name="address"
                  value={OTHER}
                  checked={choice === OTHER}
                  onChange={() => setChoice(OTHER)}
                  className={styles.radio}
                />
                <PenLine size={20} className={styles.methodIcon} aria-hidden />
                <span className={styles.optionText}>
                  <span className={styles.optionTitle}>Deliver somewhere else</span>
                </span>
              </label>
            )}
            {choice === OTHER && (
              <div className={page.field}>
                <label htmlFor={`${ids}-address`} className={saved.length > 0 ? 'visually-hidden' : page.label}>
                  Delivery address
                </label>
                <textarea
                  id={`${ids}-address`}
                  className={page.input}
                  value={otherAddress}
                  onChange={(e) => setOtherAddress(e.target.value)}
                  placeholder="House number, street, area and a landmark, e.g. 12 Bosso Road, opposite the mosque, Minna"
                  autoComplete="street-address"
                  maxLength={200}
                  rows={3}
                  aria-invalid={fieldErrors.address ? true : undefined}
                />
              </div>
            )}
            {fieldErrors.address && <p id={`${ids}-address-error`} className={page.fieldError}>{fieldErrors.address}</p>}
          </fieldset>

          <div className={page.field}>
            <label htmlFor={`${ids}-phone`} className={styles.sectionTitle}>Contact Phone</label>
            <input
              id={`${ids}-phone`}
              className={page.input}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="0803 123 4567"
              aria-invalid={fieldErrors.phone ? true : undefined}
              aria-describedby={`${ids}-phone-hint`}
            />
            <p id={`${ids}-phone-hint`} className={fieldErrors.phone ? page.fieldError : page.hint}>
              {fieldErrors.phone ?? 'Your rider will call this number on arrival.'}
            </p>
          </div>

          {eta && (
            <div className={styles.eta}>
              <span className={styles.etaIcon}><Zap size={22} aria-hidden /></span>
              <div>
                <p className={styles.etaTitle}>Bukka Dispatch</p>
                <p className={styles.etaSubtitle}>Estimated delivery in {eta}</p>
              </div>
            </div>
          )}

          <fieldset className={styles.group}>
            <legend className={styles.sectionTitle}>Payment Method</legend>
            {paymentMethods.map((m) => {
              const { subtitle, Icon } = PAYMENT_DETAILS[m] ?? { subtitle: '', Icon: Wallet };
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
                    {subtitle && <span className={styles.optionSubtitle}>{subtitle}</span>}
                  </span>
                </label>
              );
            })}
          </fieldset>
        </div>

        <aside className={styles.sideCol}>
          <section className={styles.summary} aria-labelledby="order-total-title">
            <h2 id="order-total-title" className={styles.summaryTitle}>Order Total</h2>
            <ul className={styles.summaryItems}>
              {cart.items.map((item) => (
                <li key={item.id}>
                  <span className={styles.summaryQty}>{item.quantity}×</span>
                  <span className={`${styles.summaryName} ellipsis`}>{item.foodItem.name}</span>
                  <span className={styles.summaryLine}>{formatNaira(lineTotal(item))}</span>
                </li>
              ))}
            </ul>
            <div className={styles.summaryRow}>
              <span className={styles.summaryCount}>{cart.itemCount} items · incl. fees</span>
              <span className={styles.summaryTotal}>{formatNaira(total)}</span>
            </div>
          </section>

          {error && <p role="alert" className={page.formError}>{error}</p>}

          <Button
            type="submit"
            fullWidth
            height={54}
            loading={placing}
            aria-label={placing ? 'Confirming Order...' : undefined}
            className={styles.placeButton}
          >
            Place order · {formatNaira(total)}
          </Button>
          <p className={styles.secure}><ShieldCheck size={14} aria-hidden /> Final total is confirmed by CityBukka when you order</p>
        </aside>
      </form>
    </Screen>
  );
}
