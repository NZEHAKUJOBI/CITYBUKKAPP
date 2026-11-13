enum SpiceLevel {
  none,
  mild,
  medium,
  hot,
  bukkaFire,
}

extension SpiceLevelExtension on SpiceLevel {
  String get label {
    switch (this) {
      case SpiceLevel.none:
        return 'Not Spicy';
      case SpiceLevel.mild:
        return 'Mild 🌿';
      case SpiceLevel.medium:
        return 'Medium 🌶️';
      case SpiceLevel.hot:
        return 'Hot 🌶️🌶️';
      case SpiceLevel.bukkaFire:
        return 'Bukka Fire 🔥🌶️';
    }
  }
}

class CustomizationOption {
  final String id;
  final String name;
  final double extraPrice;

  const CustomizationOption({
    required this.id,
    required this.name,
    this.extraPrice = 0.0,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'extraPrice': extraPrice,
  };

  factory CustomizationOption.fromJson(Map<String, dynamic> json) => CustomizationOption(
    id: json['id'] as String,
    name: json['name'] as String,
    extraPrice: (json['extraPrice'] as num?)?.toDouble() ?? 0.0,
  );
}

class CustomizationGroup {
  final String id;
  final String name;
  final bool isRequired;
  final int maxSelectable;
  final List<CustomizationOption> options;

  const CustomizationGroup({
    required this.id,
    required this.name,
    this.isRequired = false,
    this.maxSelectable = 1,
    required this.options,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'isRequired': isRequired,
    'maxSelectable': maxSelectable,
    'options': options.map((o) => o.toJson()).toList(),
  };

  factory CustomizationGroup.fromJson(Map<String, dynamic> json) => CustomizationGroup(
    id: json['id'] as String,
    name: json['name'] as String,
    isRequired: json['isRequired'] as bool? ?? false,
    maxSelectable: json['maxSelectable'] as int? ?? 1,
    options: (json['options'] as List<dynamic>?)
            ?.map((o) => CustomizationOption.fromJson(o as Map<String, dynamic>))
            .toList() ??
        [],
  );
}

class FoodItem {
  final String id;
  final String restaurantId;
  final String name;
  final String description;
  final double price;
  final String imageUrl;
  final String categoryId;
  final SpiceLevel spiceLevel;
  final double rating;
  final int reviewCount;
  final int calories;
  final int prepTimeMinutes;
  final bool isPopular;
  final bool isChefSpecial;
  final bool isVegetarian;
  final List<CustomizationGroup> customizationGroups;

  const FoodItem({
    required this.id,
    required this.restaurantId,
    required this.name,
    required this.description,
    required this.price,
    required this.imageUrl,
    required this.categoryId,
    this.spiceLevel = SpiceLevel.medium,
    this.rating = 4.8,
    this.reviewCount = 120,
    this.calories = 450,
    this.prepTimeMinutes = 20,
    this.isPopular = false,
    this.isChefSpecial = false,
    this.isVegetarian = false,
    this.customizationGroups = const [],
  });

  FoodItem copyWith({
    String? id,
    String? restaurantId,
    String? name,
    String? description,
    double? price,
    String? imageUrl,
    String? categoryId,
    SpiceLevel? spiceLevel,
    double? rating,
    int? reviewCount,
    int? calories,
    int? prepTimeMinutes,
    bool? isPopular,
    bool? isChefSpecial,
    bool? isVegetarian,
    List<CustomizationGroup>? customizationGroups,
  }) {
    return FoodItem(
      id: id ?? this.id,
      restaurantId: restaurantId ?? this.restaurantId,
      name: name ?? this.name,
      description: description ?? this.description,
      price: price ?? this.price,
      imageUrl: imageUrl ?? this.imageUrl,
      categoryId: categoryId ?? this.categoryId,
      spiceLevel: spiceLevel ?? this.spiceLevel,
      rating: rating ?? this.rating,
      reviewCount: reviewCount ?? this.reviewCount,
      calories: calories ?? this.calories,
      prepTimeMinutes: prepTimeMinutes ?? this.prepTimeMinutes,
      isPopular: isPopular ?? this.isPopular,
      isChefSpecial: isChefSpecial ?? this.isChefSpecial,
      isVegetarian: isVegetarian ?? this.isVegetarian,
      customizationGroups: customizationGroups ?? this.customizationGroups,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'restaurantId': restaurantId,
    'name': name,
    'description': description,
    'price': price,
    'imageUrl': imageUrl,
    'categoryId': categoryId,
    'spiceLevel': spiceLevel.index,
    'rating': rating,
    'reviewCount': reviewCount,
    'calories': calories,
    'prepTimeMinutes': prepTimeMinutes,
    'isPopular': isPopular,
    'isChefSpecial': isChefSpecial,
    'isVegetarian': isVegetarian,
    'customizationGroups': customizationGroups.map((g) => g.toJson()).toList(),
  };

  factory FoodItem.fromJson(Map<String, dynamic> json) => FoodItem(
    id: json['id'] as String,
    restaurantId: json['restaurantId'] as String,
    name: json['name'] as String,
    description: json['description'] as String,
    price: (json['price'] as num).toDouble(),
    imageUrl: json['imageUrl'] as String,
    categoryId: json['categoryId'] as String,
    spiceLevel: SpiceLevel.values[json['spiceLevel'] as int? ?? 2],
    rating: (json['rating'] as num?)?.toDouble() ?? 4.8,
    reviewCount: json['reviewCount'] as int? ?? 0,
    calories: json['calories'] as int? ?? 0,
    prepTimeMinutes: json['prepTimeMinutes'] as int? ?? 20,
    isPopular: json['isPopular'] as bool? ?? false,
    isChefSpecial: json['isChefSpecial'] as bool? ?? false,
    isVegetarian: json['isVegetarian'] as bool? ?? false,
    customizationGroups: (json['customizationGroups'] as List<dynamic>?)
            ?.map((g) => CustomizationGroup.fromJson(g as Map<String, dynamic>))
            .toList() ??
        [],
  );
}
