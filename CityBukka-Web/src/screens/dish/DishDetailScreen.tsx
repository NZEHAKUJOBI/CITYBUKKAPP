import {
  ArrowLeft, Circle, CircleDot, Flame, Heart, Leaf, SearchX, Square, SquareCheck, Timer, UtensilsCrossed, WifiOff,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, FallbackImage, QuantitySelector, RatingBadge } from '../../components/small';
import { LoadingRegion, Skeleton } from '../../components/Skeleton';
import { api } from '../../data/api';
import { Screen } from '../../layout/layout';
import { formatNaira, SPICE_LABELS } from '../../lib/format';
import { useCart } from '../../state/CartContext';
import { useToast } from '../../state/ToastContext';
import { useUser } from '../../state/UserContext';
import type { CustomizationGroup, FoodItem } from '../../types';
import {
  groupKind, initialSelection, missingRequiredGroups, selectedOptions, toggleOption, type Selection,
} from './selection';
import styles from './DishDetailScreen.module.css';

const MAX_INSTRUCTIONS = 300;

/** Port of DishDetailScreen (route /dish/:id). */
export function DishDetailScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [dish, setDish] = useState<FoodItem | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setDish(undefined);
    setFailed(false);
    api.getFoodItem(id).then(
      (item) => { if (!cancelled) setDish(item); },
      () => { if (!cancelled) setFailed(true); },
    );
    return () => { cancelled = true; };
  }, [id, attempt]);

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  if (failed) {
    return (
      <Screen header={<PageHeader title="Dish" onBack={goBack} />}>
        <EmptyState
          icon={<WifiOff size={56} />}
          title="Can't load this dish"
          message="We couldn't reach CityBukka. Check your connection and try again."
          buttonText="Try again"
          onButtonClick={() => setAttempt((n) => n + 1)}
        />
      </Screen>
    );
  }

  if (dish === undefined) {
    return (
      <Screen header={<PageHeader title="" onBack={goBack} />}>
        <LoadingRegion label="Loading dish" className={styles.layout}>
          <Skeleton className={styles.heroImage} radius={0} />
          <div className={styles.body}>
            <Skeleton width="70%" height={30} radius={10} />
            <Skeleton width="45%" height={14} style={{ marginTop: 14 }} />
            <Skeleton height={64} style={{ marginTop: 20 }} />
            <Skeleton height={180} radius={18} style={{ marginTop: 24 }} />
          </div>
        </LoadingRegion>
      </Screen>
    );
  }

  if (dish === null) {
    return (
      <Screen header={<PageHeader title="Dish" onBack={goBack} />}>
        <EmptyState
          icon={<SearchX size={56} />}
          title="Dish not found"
          message="This dish is no longer on the menu. Explore other Bukka favourites instead."
          buttonText="Back to Explore"
          onButtonClick={() => navigate('/')}
        />
      </Screen>
    );
  }

  return <DishDetail key={dish.id} dish={dish} onBack={goBack} />;
}

function DishDetail({ dish, onBack }: { dish: FoodItem; onBack: () => void }) {
  const { addItem } = useCart();
  const { isFoodFavorite, toggleFoodFavorite } = useUser();
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selection, setSelection] = useState<Selection>(() => initialSelection(dish.customizationGroups));
  const [instructions, setInstructions] = useState('');
  const instructionsId = useId();
  const hintId = useId();

  const groups = dish.customizationGroups;
  const chosen = useMemo(() => selectedOptions(groups, selection), [groups, selection]);
  const missing = missingRequiredGroups(groups, selection);
  const unitPrice = dish.price + chosen.reduce((sum, o) => sum + o.extraPrice, 0);
  const total = unitPrice * quantity;
  const favorite = isFoodFavorite(dish.id);

  const addToBag = () => {
    if (missing.length > 0) return;
    addItem({ foodItem: dish, quantity, selectedOptions: chosen, specialInstructions: instructions.trim() });
    toast(`Added ${dish.name} to your Bukka bag!`, 'success');
    onBack();
  };

  return (
    <div className={styles.root}>
      <div className={styles.topBar}>
        <button type="button" className={styles.circleButton} onClick={onBack} aria-label="Go back">
          <ArrowLeft size={22} aria-hidden />
        </button>
        <button
          type="button"
          className={`${styles.circleButton} ${favorite ? styles.favoriteOn : ''}`}
          onClick={() => toggleFoodFavorite(dish.id)}
          aria-pressed={favorite}
          aria-label={favorite ? `Remove ${dish.name} from saved` : `Save ${dish.name}`}
        >
          <Heart size={22} fill={favorite ? 'currentColor' : 'none'} aria-hidden />
        </button>
      </div>

      <Screen
        footer={
          <div className={styles.orderBar}>
            <QuantitySelector quantity={quantity} onChange={setQuantity} />
            <Button
              className={styles.addButton}
              onClick={addToBag}
              disabled={missing.length > 0}
              aria-describedby={missing.length > 0 ? hintId : undefined}
            >
              Add to Bag <span aria-hidden>•</span> {formatNaira(total)}
            </Button>
          </div>
        }
      >
        <div className={styles.layout}>
          <div className={styles.hero}>
            <FallbackImage src={dish.imageUrl} alt={dish.name} className={styles.heroImage}
              fallbackIcon={<UtensilsCrossed size={64} />} priority />
            <div className={styles.heroShade} aria-hidden />
          </div>

          <div className={styles.body}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{dish.name}</h1>
              <RatingBadge rating={dish.rating} reviewCount={dish.reviewCount} />
            </div>

            <div className={styles.pills}>
              <span className={styles.pill}><Timer size={14} aria-hidden /> {dish.prepTimeMinutes} mins</span>
              <span className={styles.pill}><Flame size={14} aria-hidden /> {dish.calories} kcal</span>
              <span className={styles.spicePill}>{SPICE_LABELS[dish.spiceLevel]}</span>
              {dish.isVegetarian && <span className={styles.vegPill}><Leaf size={14} aria-hidden /> Vegetarian</span>}
            </div>

            <p className={styles.description}>{dish.description}</p>

            {groups.map((group) => (
              <OptionGroup
                key={group.id}
                group={group}
                selected={selection[group.id] ?? []}
                onToggle={(optionId) => setSelection((s) => toggleOption(s, group, optionId))}
              />
            ))}

            <label htmlFor={instructionsId} className={styles.sectionTitle}>Special Instructions</label>
            <textarea
              id={instructionsId}
              className={styles.instructions}
              rows={2}
              maxLength={MAX_INSTRUCTIONS}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Extra spicy, no onions, pack soup separately..."
            />
            <p className={styles.counter} aria-live="polite">{instructions.length}/{MAX_INSTRUCTIONS}</p>

            {missing.length > 0 && (
              <p id={hintId} className={styles.missing}>
                Choose {missing.map((g) => g.name).join(', ')} to continue.
              </p>
            )}
          </div>
        </div>
      </Screen>
    </div>
  );
}

function OptionGroup({ group, selected, onToggle }: {
  group: CustomizationGroup; selected: string[]; onToggle: (optionId: string) => void;
}) {
  const kind = groupKind(group);
  const name = useId();
  const full = kind === 'multi' && selected.length >= group.maxSelectable;

  return (
    <fieldset className={styles.group}>
      <legend className="visually-hidden">
        {group.name} ({group.isRequired ? 'required' : 'optional'}
        {kind === 'multi' ? `, choose up to ${group.maxSelectable}` : ''})
      </legend>
      <div className={styles.groupHeader} aria-hidden>
        <span className={styles.groupName}>{group.name}</span>
        <span className={group.isRequired ? styles.required : styles.optional}>
          {group.isRequired ? 'REQUIRED' : 'OPTIONAL'}
        </span>
      </div>
      {kind === 'multi' && (
        <p className={styles.groupHint} aria-hidden>Choose up to {group.maxSelectable}</p>
      )}

      {group.options.map((option) => {
        const isSelected = selected.includes(option.id);
        const disabled = full && !isSelected;
        const Icon = kind === 'multi'
          ? (isSelected ? SquareCheck : Square)
          : (isSelected ? CircleDot : Circle);
        return (
          <label key={option.id} className={`${styles.option} ${disabled ? styles.optionDisabled : ''}`}>
            {kind === 'multi' ? (
              <input
                type="checkbox"
                className="visually-hidden"
                checked={isSelected}
                disabled={disabled}
                onChange={() => onToggle(option.id)}
              />
            ) : (
              <input
                type="radio"
                className="visually-hidden"
                name={name}
                checked={isSelected}
                onChange={() => onToggle(option.id)}
                // Optional single-choice groups: tapping the chosen option clears it.
                onClick={() => { if (kind === 'optionalSingle' && isSelected) onToggle(option.id); }}
              />
            )}
            <Icon size={20} className={isSelected ? styles.iconOn : styles.iconOff} aria-hidden />
            <span className={styles.optionName}>{option.name}</span>
            {option.extraPrice > 0 && <span className={styles.extra}>+{formatNaira(option.extraPrice)}</span>}
          </label>
        );
      })}
    </fieldset>
  );
}
