import 'food_item.dart';

class CartItem {
  final String id;
  final FoodItem foodItem;
  final int quantity;
  final List<CustomizationOption> selectedOptions;
  final String specialInstructions;

  const CartItem({
    required this.id,
    required this.foodItem,
    this.quantity = 1,
    this.selectedOptions = const [],
    this.specialInstructions = '',
  });

  double get unitPrice {
    final extra = selectedOptions.fold<double>(0.0, (sum, opt) => sum + opt.extraPrice);
    return foodItem.price + extra;
  }

  double get totalPrice => unitPrice * quantity;

  CartItem copyWith({
    String? id,
    FoodItem? foodItem,
    int? quantity,
    List<CustomizationOption>? selectedOptions,
    String? specialInstructions,
  }) {
    return CartItem(
      id: id ?? this.id,
      foodItem: foodItem ?? this.foodItem,
      quantity: quantity ?? this.quantity,
      selectedOptions: selectedOptions ?? this.selectedOptions,
      specialInstructions: specialInstructions ?? this.specialInstructions,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'foodItem': foodItem.toJson(),
    'quantity': quantity,
    'selectedOptions': selectedOptions.map((o) => o.toJson()).toList(),
    'specialInstructions': specialInstructions,
  };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
    id: json['id'] as String,
    foodItem: FoodItem.fromJson(json['foodItem'] as Map<String, dynamic>),
    quantity: json['quantity'] as int? ?? 1,
    selectedOptions: (json['selectedOptions'] as List<dynamic>?)
            ?.map((o) => CustomizationOption.fromJson(o as Map<String, dynamic>))
            .toList() ??
        [],
    specialInstructions: json['specialInstructions'] as String? ?? '',
  );
}
