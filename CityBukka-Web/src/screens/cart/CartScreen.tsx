import { Bike, CircleCheck, ShoppingBag, Ticket, UtensilsCrossed, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { EmptyState, FallbackImage, QuantitySelector } from '../../components/small';
import { Screen } from '../../layout/layout';
import { formatNaira } from '../../lib/format';
import { lineTotal } from '../../lib/pricing';
import { useCart } from '../../state/CartContext';
import type { CartItem } from '../../types';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './CartScreen.module.css';

/** Port of CityBukka-MX ui/features/cart/views/cart_screen.dart ("My Bukka Bag"). */
export function CartScreen() {
  const cart = useCart();
  const navigate = useNavigate();
  const [confirmClear, setConfirmClear] = useState(false);

  const header = (
    <header className={styles.header}>
      <div className={styles.headerText}>
        <h1 className={styles.title}>My Bukka Bag</h1>
        {cart.items.length > 0 && (
          <p className={styles.subtitle}>{cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'} ready to chop</p>
        )}
      </div>
      {cart.items.length > 0 && (
        <button type="button" className={`${styles.textButton} ${styles.danger}`} onClick={() => setConfirmClear(true)}>
          Clear
        </button>
      )}
    </header>
  );

  const dialog = confirmClear && (
    <ConfirmDialog
      title="Empty Bukka Bag?"
      message="Are you sure you want to remove all items from your bag?"
      confirmText="Clear"
      onCancel={() => setConfirmClear(false)}
      onConfirm={() => {
        cart.clear();
        setConfirmClear(false);
      }}
    />
  );

  if (cart.items.length === 0) {
    return (
      <Screen header={header}>
        <EmptyState
          icon={<ShoppingBag size={56} />}
          title="Your Bukka Bag is Empty"
          message="Discover spicy jollof, tender goat meat suya, and native soups to start feasting."
          buttonText="Explore Menu"
          onButtonClick={() => navigate('/')}
        />
        {dialog}
      </Screen>
    );
  }

  const freeDeliveryDiff = cart.freeDeliveryThreshold - cart.subtotal;

  const footer = (
    <div className={styles.checkoutBar}>
      <div>
        <p className={styles.totalLabel}>Total Amount</p>
        <p className={styles.totalValue}>{formatNaira(cart.total)}</p>
      </div>
      <Button fullWidth className={styles.checkoutButton} onClick={() => navigate('/checkout')}>
        Checkout ({cart.itemCount})
      </Button>
    </div>
  );

  return (
    <Screen header={header} footer={footer}>
      <div className={styles.body}>
        <div className={styles.mainCol}>
          {freeDeliveryDiff > 0 ? (
            <div className={`${styles.banner} ${styles.bannerGold}`}>
              <span className={styles.bannerIcon}><Bike size={20} aria-hidden /></span>
              <div className={styles.bannerText}>
                <p>Add {formatNaira(freeDeliveryDiff)} more to unlock FREE Bukka delivery!</p>
                <span className={styles.progress} aria-hidden>
                  <span style={{ width: `${Math.min(100, (cart.subtotal / cart.freeDeliveryThreshold) * 100)}%` }} />
                </span>
              </div>
            </div>
          ) : (
            <div className={`${styles.banner} ${styles.bannerGreen}`}>
              <span className={styles.bannerIcon}><CircleCheck size={20} aria-hidden /></span>
              <p>You unlocked FREE Bukka Delivery! 🎉</p>
            </div>
          )}

          <ul className={styles.items} aria-label="Items in your bag">
            {cart.items.map((item) => (
              <CartItemTile
                key={item.id}
                item={item}
                onRemove={() => cart.removeItem(item.id)}
                onQuantity={(q) => cart.updateQuantity(item.id, q)}
              />
            ))}
          </ul>
        </div>

        <aside className={styles.sideCol}>
          <PromoSection />

          <section className={styles.card} aria-labelledby="bill-title">
            <h2 id="bill-title" className={styles.cardTitle}>Bill Details</h2>
            <dl className={styles.bill}>
              <BillRow title="Item Subtotal" amount={formatNaira(cart.subtotal)} />
              <BillRow
                title="Delivery Partner Fee"
                amount={cart.deliveryFee === 0 ? 'FREE' : formatNaira(cart.deliveryFee)}
                green={cart.deliveryFee === 0}
              />
              <BillRow title="Eco Packaging Fee" amount={formatNaira(cart.packagingFee)} />
              <BillRow title="Restaurant Service Fee" amount={formatNaira(cart.serviceFee)} />
              {cart.discount > 0 && (
                <BillRow title="Bukka Promo Discount" amount={`-${formatNaira(cart.discount)}`} green />
              )}
              <hr className={styles.divider} />
              <BillRow title="Grand Total" amount={formatNaira(cart.total)} bold />
            </dl>
          </section>
        </aside>
      </div>
      {dialog}
    </Screen>
  );
}

function CartItemTile({ item, onRemove, onQuantity }: {
  item: CartItem; onRemove: () => void; onQuantity: (q: number) => void;
}) {
  return (
    <li className={styles.item}>
      <FallbackImage
        src={item.foodItem.imageUrl}
        alt=""
        className={styles.itemImage}
        fallbackIcon={<UtensilsCrossed size={24} />}
      />
      <div className={styles.itemBody}>
        <div className={styles.itemTop}>
          <h3 className={styles.itemName}>{item.foodItem.name}</h3>
          <button type="button" className={styles.iconButton} aria-label={`Remove ${item.foodItem.name}`} onClick={onRemove}>
            <X size={18} aria-hidden />
          </button>
        </div>
        {item.selectedOptions.length > 0 && (
          <ul className={styles.options} aria-label="Selected options">
            {item.selectedOptions.map((opt) => <li key={opt.id} className={styles.option}>{opt.name}</li>)}
          </ul>
        )}
        <div className={styles.itemBottom}>
          <span className={styles.itemPrice}>{formatNaira(lineTotal(item))}</span>
          <QuantitySelector quantity={item.quantity} compact onChange={onQuantity} />
        </div>
      </div>
    </li>
  );
}

function PromoSection() {
  const { promoCode, discount, applyPromo, removePromo } = useCart();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  if (promoCode) {
    return (
      <div className={styles.promoApplied}>
        <span className={styles.promoAppliedIcon}><Ticket size={18} aria-hidden /></span>
        <p>Code {promoCode} Applied (-{formatNaira(discount)})</p>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={`Remove promo code ${promoCode}`}
          onClick={() => {
            removePromo();
            setMessage(null);
          }}
        >
          <X size={18} aria-hidden />
        </button>
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    if (applyPromo(trimmed)) {
      setMessage({ text: `Promo code ${trimmed} applied successfully! 🎉`, error: false });
      setCode('');
    } else {
      setMessage({ text: 'Invalid promo code. Try "BUKKA20" or "HOTBUKKA"', error: true });
    }
  };

  return (
    <form className={styles.promo} onSubmit={submit} noValidate>
      <div className={styles.promoRow}>
        <Ticket size={18} className={styles.promoIcon} aria-hidden />
        <label htmlFor="promo-code" className="visually-hidden">Promo code</label>
        <input
          id="promo-code"
          className={styles.promoInput}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Promo Code (try BUKKA20)"
          autoCapitalize="characters"
          autoComplete="off"
          aria-invalid={message?.error || undefined}
          aria-describedby={message ? 'promo-message' : undefined}
        />
        <button type="submit" className={styles.applyButton}>Apply</button>
      </div>
      {message && (
        <p
          id="promo-message"
          role={message.error ? 'alert' : 'status'}
          className={`${styles.promoMessage} ${message.error ? styles.promoError : ''}`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}

function BillRow({ title, amount, bold = false, green = false }: {
  title: string; amount: string; bold?: boolean; green?: boolean;
}) {
  return (
    <div className={`${styles.billRow} ${bold ? styles.billBold : ''}`}>
      <dt>{title}</dt>
      <dd className={green ? styles.green : undefined}>{amount}</dd>
    </div>
  );
}
