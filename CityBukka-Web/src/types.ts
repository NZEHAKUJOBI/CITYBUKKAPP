// Domain models – same JSON shapes as CityBukka-MX (Dart) and CityBukka-Server.

export const SpiceLevel = { none: 0, mild: 1, medium: 2, hot: 3, bukkaFire: 4 } as const;
export type SpiceLevel = (typeof SpiceLevel)[keyof typeof SpiceLevel];

export const OrderStatus = {
  placed: 0,
  preparing: 1,
  riderAssigned: 2,
  outForDelivery: 3,
  delivered: 4,
  cancelled: 5,
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export interface FoodCategory {
  id: string;
  name: string;
  iconEmoji: string;
  description: string;
}

export interface Restaurant {
  id: string;
  name: string;
  tagline: string;
  description: string;
  coverImageUrl: string;
  logoUrl: string;
  rating: number;
  reviewCount: number;
  deliveryTimeMin: number;
  deliveryTimeMax: number;
  deliveryFee: number;
  distanceKm: number;
  cuisines: string[];
  isFeatured: boolean;
  isOpen: boolean;
  address: string;
  badges: string[];
}

export interface CustomizationOption {
  id: string;
  name: string;
  extraPrice: number;
}

export interface CustomizationGroup {
  id: string;
  name: string;
  isRequired: boolean;
  maxSelectable: number;
  options: CustomizationOption[];
}

export interface FoodItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: string;
  spiceLevel: SpiceLevel;
  rating: number;
  reviewCount: number;
  calories: number;
  prepTimeMinutes: number;
  isPopular: boolean;
  isChefSpecial: boolean;
  isVegetarian: boolean;
  customizationGroups: CustomizationGroup[];
}

export interface CartItem {
  id: string;
  foodItem: FoodItem;
  quantity: number;
  selectedOptions: CustomizationOption[];
  specialInstructions: string;
}

export interface OrderRider {
  id: string;
  name: string;
  phone: string | null;
  vehicle: string | null;
}

export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  packagingFee: number;
  discount: number;
  total: number;
  promoCode?: string | null;
  status: OrderStatus;
  /** ISO-8601 timestamp */
  createdAt: string;
  updatedAt?: string;
  deliveryAddress: string;
  /** Number the rider calls on arrival (defaults to the customer's phone). */
  contactPhone: string;
  paymentMethod: string;
  /** Set once a rider has been assigned. */
  rider: OrderRider | null;
  estimatedDeliveryMinutes: number;
}

export type UserRole = 'customer' | 'rider' | 'admin' | string;

/** Signed-in customer as returned by /api/auth/* and /api/me. */
export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: UserRole;
  avatarUrl: string | null;
  loyaltyPoints: number;
  savedAddresses: string[];
  selectedAddress: string | null;
  isDarkMode: boolean;
  createdAt?: string;
}

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  packagingFee: number;
  discount: number;
  total: number;
}
