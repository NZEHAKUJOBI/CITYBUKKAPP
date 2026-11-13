import 'package:flutter_test/flutter_test.dart';
import 'package:citybukka_mx/domain/models/food_item.dart';
import 'package:citybukka_mx/domain/models/cart_item.dart';

void main() {
  group('FoodItem and Customization Tests', () {
    test('FoodItem calculates prices and JSON serialization correctly', () {
      const item = FoodItem(
        id: 'food_1',
        restaurantId: 'rest_1',
        name: 'Smoky Party Jollof',
        description: 'Smoky firewood jollof rice with grilled chicken',
        price: 3500.0,
        imageUrl: 'https://example.com/jollof.jpg',
        categoryId: 'cat_rice',
        spiceLevel: SpiceLevel.hot,
      );

      expect(item.name, 'Smoky Party Jollof');
      expect(item.price, 3500.0);
      expect(item.spiceLevel, SpiceLevel.hot);
      expect(item.spiceLevel.label, contains('Hot'));

      final json = item.toJson();
      final fromJson = FoodItem.fromJson(json);
      expect(fromJson.id, item.id);
      expect(fromJson.price, item.price);
    });

    test('CartItem calculates unit price with customizations', () {
      const food = FoodItem(
        id: 'food_egusi',
        restaurantId: 'rest_1',
        name: 'Egusi Supreme',
        description: 'Melon seed stew with pounded yam',
        price: 4000.0,
        imageUrl: 'https://example.com/egusi.jpg',
        categoryId: 'cat_soups',
      );

      const option1 = CustomizationOption(id: 'opt_goat', name: 'Goat Meat', extraPrice: 1000.0);
      const option2 = CustomizationOption(id: 'opt_dodo', name: 'Extra Dodo', extraPrice: 500.0);

      final cartItem = CartItem(
        id: 'cart_1',
        foodItem: food,
        quantity: 2,
        selectedOptions: const [option1, option2],
      );

      expect(cartItem.unitPrice, 5500.0); // 4000 + 1000 + 500
      expect(cartItem.totalPrice, 11000.0); // 5500 * 2
    });
  });
}
