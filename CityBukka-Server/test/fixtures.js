// Small test catalogue. Not seeded anywhere: tests create it through the admin API
// (or use it directly for the pure pricing tests). No images on purpose.

const opt = (id, name, extraPrice = 0) => ({ id, name, extraPrice });

export const categories = [
  { id: 'cat_rice', name: 'Rice & Grains', iconEmoji: '🍚' },
  { id: 'cat_drinks', name: 'Drinks', iconEmoji: '🍹' },
];

export const restaurants = [
  {
    id: 'rest_mama_ope', name: 'Mama Ope Bukka', tagline: 'Woodfire soul food',
    cuisines: ['Yoruba Bukka', 'Jollof'], deliveryTimeMin: 25, deliveryTimeMax: 35, deliveryFee: 650,
    isFeatured: true, isOpen: true, address: '14 Bosso Road, Minna',
  },
  {
    id: 'rest_kano_suya', name: 'Kano Suya Grills', tagline: 'Charcoal suya',
    cuisines: ['Suya & Asun'], deliveryTimeMin: 20, deliveryTimeMax: 30, deliveryFee: 500,
    isOpen: true, address: '22 Shiroro Road, Minna',
  },
  {
    id: 'rest_sweet_street', name: 'Street Bites & Coolers', tagline: 'Chilled drinks',
    cuisines: ['Chilled Drinks'], deliveryTimeMin: 15, deliveryTimeMax: 25, deliveryFee: 400,
    isOpen: true, address: '3 Paiko Road, Minna',
  },
];

export const foodItems = [
  {
    id: 'food_jellof_rice', restaurantId: 'rest_mama_ope', categoryId: 'cat_rice',
    name: 'Smoky Jellof Rice', description: 'Party jollof', price: 3500, prepTimeMinutes: 20, isPopular: true,
    customizationGroups: [
      { id: 'protein_opt', name: 'Choose Your Protein', isRequired: true, maxSelectable: 1,
        options: [opt('p_chk', 'Peppered Chicken'), opt('p_goat', 'Goat Meat', 1200)] },
      { id: 'addons_opt', name: 'Add-ons', isRequired: false, maxSelectable: 3,
        options: [opt('a_dodo', 'Extra Dodo', 500)] },
    ],
  },
  {
    id: 'food_fried_rice', restaurantId: 'rest_mama_ope', categoryId: 'cat_rice',
    name: 'Fried Rice', description: 'Savoury fried rice', price: 3800, prepTimeMinutes: 20,
    customizationGroups: [
      { id: 'fried_rice_protein', name: 'Choose Your Protein', isRequired: true, maxSelectable: 1,
        options: [opt('fr_chicken', 'Fried Chicken')] },
    ],
  },
  {
    id: 'food_zobo', restaurantId: 'rest_sweet_street', categoryId: 'cat_drinks',
    name: 'Chilled Zobo', description: 'Hibiscus drink', price: 1000, prepTimeMinutes: 5,
    customizationGroups: [
      { id: 'zobo_chill', name: 'Serving Temperature', isRequired: true, maxSelectable: 1,
        options: [opt('zb_ice', 'Ice-Cold')] },
    ],
  },
  {
    id: 'food_kunu', restaurantId: 'rest_kano_suya', categoryId: 'cat_drinks',
    name: 'Kunu Zaki', description: 'Millet drink', price: 1200, prepTimeMinutes: 5, customizationGroups: [],
  },
];

/** Pricing helpers expect full FoodItem / Restaurant objects; fill in the API defaults. */
export const getFood = (id) => {
  const f = foodItems.find((x) => x.id === id);
  return f ? { isAvailable: true, ...f } : null;
};
export const getRestaurant = (id) => restaurants.find((r) => r.id === id) ?? null;
