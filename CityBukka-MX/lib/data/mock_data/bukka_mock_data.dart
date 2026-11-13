import '../../domain/models/category.dart';
import '../../domain/models/food_item.dart';
import '../../domain/models/restaurant.dart';
import '../../domain/models/user_profile.dart';

class BukkaMockData {
  static const List<FoodCategory> categories = [
    FoodCategory(
      id: 'cat_all',
      name: 'All Dishes',
      iconEmoji: '🍽️',
      description: 'Explore our complete authentic Minna menu',
    ),
    FoodCategory(
      id: 'cat_rice',
      name: 'Rice & Grains',
      iconEmoji: '🍚',
      description: 'Smoky Jellof Rice & Savory Fried Rice',
    ),
    FoodCategory(
      id: 'cat_moimoi',
      name: 'Moimoi & Savories',
      iconEmoji: '🥟',
      description: 'Steamed bean pudding & traditional specialties',
    ),
    FoodCategory(
      id: 'cat_drinks',
      name: 'Zobo & Kunu Drinks',
      iconEmoji: '🍹',
      description: 'Chilled Zobo, Special Kunu Zaki & Creamy Kunu Aya',
    ),
  ];

  static final List<Restaurant> restaurants = [
    const Restaurant(
      id: 'rest_mama_ope',
      name: 'Mama Ope Bukka Central',
      tagline: 'Minna’s Iconic Woodfire Soul Food',
      description:
          'Founded over two decades ago, Mama Ope crafts soulful Nigerian comfort meals using cast-iron pots over seasoned firewood embers for that unmistakable bukka aroma.',
      coverImageUrl:
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      logoUrl:
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80',
      rating: 4.9,
      reviewCount: 382,
      deliveryTimeMin: 25,
      deliveryTimeMax: 35,
      deliveryFee: 650.0,
      distanceKm: 2.1,
      cuisines: ['Yoruba Bukka', 'Jollof Fiesta', 'Native Soups'],
      isFeatured: true,
      isOpen: true,
      address: '14 Bosso Road, Tunga, Minna, Niger State',
      badges: ['Chef Favorite', 'Woodfire Slow-Cooked', 'Top Rated'],
    ),
    const Restaurant(
      id: 'rest_kano_suya',
      name: 'Kano Suya & Charcoal Grills',
      tagline: 'Master Yaji Artisans & Flame Grills',
      description:
          'Authentic Hausa-Fulani suya tradition with tender cutlets dusted in aged Northern spices, grilled fresh upon order over coconut charcoal.',
      coverImageUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
      logoUrl:
          'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&q=80',
      rating: 4.8,
      reviewCount: 295,
      deliveryTimeMin: 20,
      deliveryTimeMax: 30,
      deliveryFee: 500.0,
      distanceKm: 1.8,
      cuisines: ['Suya & Asun', 'Charcoal Grills', 'Northern Delights'],
      isFeatured: true,
      isOpen: true,
      address: '22 Shiroro Road, GRA, Minna, Niger State',
      badges: ['Halal Certified', 'Secret Yaji Spice', 'Fast Dispatch'],
    ),
    const Restaurant(
      id: 'rest_calabar_wharf',
      name: 'Calabar Kitchen & Seafood Wharf',
      tagline: 'Royal Riverine & Coastal Aromatics',
      description:
          'Straight from Cross River and Akwa Ibom shores, serving authentic Edikang Ikong, fisherman soups, and giant tiger prawns cooked in aromatic herbs.',
      coverImageUrl:
          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
      logoUrl:
          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
      rating: 4.7,
      reviewCount: 210,
      deliveryTimeMin: 30,
      deliveryTimeMax: 45,
      deliveryFee: 800.0,
      distanceKm: 3.5,
      cuisines: ['Seafood', 'Calabar Soups', 'Fresh Herbs'],
      isFeatured: false,
      isOpen: true,
      address: '8 David Mark Road, Chanchaga, Minna, Niger State',
      badges: ['Ocean Fresh', 'Heritage Recipes'],
    ),
    const Restaurant(
      id: 'rest_sweet_street',
      name: 'Minna Central Street Bites & Coolers',
      tagline: 'Crispy Street Munchies & Chilled Elixirs',
      description:
          'The pulse of Minna street snacking: warm golden puff-puff, spicy akara, and artisanal chilled hibiscus zobo with pressed tropical juices.',
      coverImageUrl:
          'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
      logoUrl:
          'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=200&q=80',
      rating: 4.8,
      reviewCount: 165,
      deliveryTimeMin: 15,
      deliveryTimeMax: 25,
      deliveryFee: 400.0,
      distanceKm: 1.2,
      cuisines: ['Street Bites', 'Finger Foods', 'Chilled Drinks'],
      isFeatured: false,
      isOpen: true,
      address: '3 Paiko Road, Central Market, Minna, Niger State',
      badges: ['Fast Delivery', 'Party Favorites'],
    ),
  ];

  static final List<FoodItem> foodItems = [
    // 1. Jellof Rice
    const FoodItem(
      id: 'food_jellof_rice',
      restaurantId: 'rest_mama_ope',
      name: 'Smoky Party Jellof Rice',
      description:
          'Authentic Nigerian party Jellof rice slow-cooked in rich tomato, rodo, and tatashe pepper reduction over woodfire embers. Served with tender peppered chicken and fried sweet dodo.',
      price: 3500.0,
      imageUrl:
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      categoryId: 'cat_rice',
      spiceLevel: SpiceLevel.medium,
      rating: 4.9,
      reviewCount: 342,
      calories: 650,
      prepTimeMinutes: 20,
      isPopular: true,
      isChefSpecial: true,
      customizationGroups: [
        CustomizationGroup(
          id: 'protein_opt',
          name: 'Choose Your Protein',
          isRequired: true,
          options: [
            CustomizationOption(id: 'p_chk', name: 'Peppered Chicken (Included)', extraPrice: 0.0),
            CustomizationOption(id: 'p_goat', name: 'Tender Bukka Goat Meat', extraPrice: 1200.0),
            CustomizationOption(id: 'p_turkey', name: 'Jumbo Fried Turkey', extraPrice: 1500.0),
            CustomizationOption(id: 'p_fish', name: 'Fried Titus Fish Steak', extraPrice: 1000.0),
          ],
        ),
        CustomizationGroup(
          id: 'addons_opt',
          name: 'Delicious Add-ons',
          isRequired: false,
          maxSelectable: 3,
          options: [
            CustomizationOption(id: 'a_dodo', name: 'Extra Fried Dodo (Plantain)', extraPrice: 500.0),
            CustomizationOption(id: 'a_moimoi', name: 'Side Steamed Moimoi Wrap', extraPrice: 700.0),
            CustomizationOption(id: 'a_egg', name: 'Boiled Farm Egg', extraPrice: 300.0),
            CustomizationOption(id: 'a_coleslaw', name: 'Crisp Island Coleslaw', extraPrice: 400.0),
          ],
        ),
      ],
    ),

    // 2. Fried Rice
    const FoodItem(
      id: 'food_fried_rice',
      restaurantId: 'rest_mama_ope',
      name: 'Savory Special Fried Rice',
      description:
          'Seasoned yellow long-grain party rice tossed with diced beef liver, sweet yellow corn, carrots, green peas, and scallions in rich aromatic chicken broth.',
      price: 3800.0,
      imageUrl:
          'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80',
      categoryId: 'cat_rice',
      spiceLevel: SpiceLevel.mild,
      rating: 4.8,
      reviewCount: 289,
      calories: 610,
      prepTimeMinutes: 20,
      isPopular: true,
      isChefSpecial: true,
      customizationGroups: [
        CustomizationGroup(
          id: 'fried_rice_protein',
          name: 'Choose Your Protein',
          isRequired: true,
          options: [
            CustomizationOption(id: 'fr_chicken', name: 'Golden Fried Chicken (Included)', extraPrice: 0.0),
            CustomizationOption(id: 'fr_turkey', name: 'Crispy Fried Turkey Wing', extraPrice: 1500.0),
            CustomizationOption(id: 'fr_beef', name: 'Peppered Beef Chunk', extraPrice: 1100.0),
          ],
        ),
        CustomizationGroup(
          id: 'fried_rice_extras',
          name: 'Add-on Sides',
          isRequired: false,
          options: [
            CustomizationOption(id: 'fr_dodo', name: 'Golden Fried Plantain (Dodo)', extraPrice: 500.0),
            CustomizationOption(id: 'fr_liver', name: 'Extra Sautéed Liver & Gizzard', extraPrice: 800.0),
            CustomizationOption(id: 'fr_egg', name: 'Boiled Farm Egg', extraPrice: 300.0),
          ],
        ),
      ],
    ),

    // 3. Moimoi
    const FoodItem(
      id: 'food_moimoi',
      restaurantId: 'rest_mama_ope',
      name: 'Special Steamed Moimoi',
      description:
          'Steamed savory black-eyed bean pudding blended with red bell peppers, crayfish, and smoked fish flakes. Tender, fluffy, and garnished with boiled egg slices.',
      price: 1200.0,
      imageUrl:
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
      categoryId: 'cat_moimoi',
      spiceLevel: SpiceLevel.mild,
      rating: 4.9,
      reviewCount: 195,
      calories: 320,
      prepTimeMinutes: 10,
      isPopular: true,
      isChefSpecial: false,
      customizationGroups: [
        CustomizationGroup(
          id: 'moimoi_fillings',
          name: 'Fillings & Garnish',
          isRequired: false,
          options: [
            CustomizationOption(id: 'mm_egg', name: 'Extra Boiled Egg Portion', extraPrice: 300.0),
            CustomizationOption(id: 'mm_fish', name: 'Flaked Smoked Titus Fish', extraPrice: 400.0),
          ],
        ),
      ],
    ),

    // 4. Zobo
    const FoodItem(
      id: 'food_zobo',
      restaurantId: 'rest_sweet_street',
      name: 'Artisanal Chilled Zobo (500ml)',
      description:
          'Refreshing deep ruby hibiscus iced brew steeped with fresh crushed ginger root, cloves, and star anise, sweetened with pressed pineapple and citrus.',
      price: 1000.0,
      imageUrl:
          'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=800&q=80',
      categoryId: 'cat_drinks',
      spiceLevel: SpiceLevel.none,
      rating: 4.9,
      reviewCount: 412,
      calories: 120,
      prepTimeMinutes: 5,
      isPopular: true,
      isChefSpecial: true,
      customizationGroups: [
        CustomizationGroup(
          id: 'zobo_chill',
          name: 'Serving Temperature',
          isRequired: true,
          options: [
            CustomizationOption(id: 'zb_ice', name: 'Ice-Cold Glass Serving', extraPrice: 0.0),
            CustomizationOption(id: 'zb_bottle', name: 'Chilled Bottle Only (No Ice)', extraPrice: 0.0),
          ],
        ),
        CustomizationGroup(
          id: 'zobo_flavor',
          name: 'Flavor Boost',
          isRequired: false,
          options: [
            CustomizationOption(id: 'zb_ginger', name: 'Extra Spicy Ginger Kick', extraPrice: 100.0),
          ],
        ),
      ],
    ),

    // 5. Special Kunu Zaki
    const FoodItem(
      id: 'food_kunu_zaki',
      restaurantId: 'rest_kano_suya',
      name: 'Special Kunu Zaki (500ml)',
      description:
          'Traditional Northern spiced millet beverage crafted with sprouted grains, sweet potato essence, crushed ginger, cloves, and cardamom. Soothing and deeply authentic.',
      price: 1200.0,
      imageUrl:
          'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
      categoryId: 'cat_drinks',
      spiceLevel: SpiceLevel.none,
      rating: 4.8,
      reviewCount: 230,
      calories: 180,
      prepTimeMinutes: 5,
      isPopular: true,
      isChefSpecial: false,
      customizationGroups: [
        CustomizationGroup(
          id: 'kunu_zaki_style',
          name: 'Serving Preference',
          isRequired: true,
          options: [
            CustomizationOption(id: 'kz_chilled', name: 'Ice-Chilled Bottle', extraPrice: 0.0),
            CustomizationOption(id: 'kz_spicy', name: 'Extra Ginger & Cloves Blend', extraPrice: 100.0),
          ],
        ),
      ],
    ),

    // 6. Creamy Kunu Aya
    const FoodItem(
      id: 'food_kunu_aya',
      restaurantId: 'rest_kano_suya',
      name: 'Creamy Kunu Aya (Tiger Nut Milk - 500ml)',
      description:
          'Luxurious and velvety Nigerian tiger nut milk blended with plump sweet dates (dabino), coconut cream, and a subtle touch of ginger. Served ice-cold and naturally creamy.',
      price: 1500.0,
      imageUrl:
          'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80',
      categoryId: 'cat_drinks',
      spiceLevel: SpiceLevel.none,
      rating: 5.0,
      reviewCount: 375,
      calories: 240,
      prepTimeMinutes: 5,
      isPopular: true,
      isChefSpecial: true,
      customizationGroups: [
        CustomizationGroup(
          id: 'kunu_aya_opt',
          name: 'Texture & Sweetness',
          isRequired: false,
          options: [
            CustomizationOption(id: 'ka_extra_dates', name: 'Extra Sweet Dates (Dabino) Boost', extraPrice: 200.0),
            CustomizationOption(id: 'ka_thick', name: 'Double Creamy Coconut Blend', extraPrice: 200.0),
          ],
        ),
      ],
    ),
  ];

  static const UserProfile initialUser = UserProfile(
    id: 'user_001',
    name: 'Tunde Adeleke',
    email: 'tunde.adeleke@citybukka.com',
    phone: '+234 802 345 6789',
    avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    loyaltyPoints: 750,
  );
}
