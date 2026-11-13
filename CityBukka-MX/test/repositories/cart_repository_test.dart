import 'package:flutter_test/flutter_test.dart';
import 'package:citybukka_mx/data/repositories/cart_repository.dart';
import 'package:citybukka_mx/domain/models/food_item.dart';
import 'package:citybukka_mx/domain/models/cart_item.dart';
import 'package:citybukka_mx/core/constants/app_constants.dart';

void main() {
  group('CartRepository Tests', () {
    late CartRepository cartRepo;
    const testFood = FoodItem(
      id: 'food_jollof',
      restaurantId: 'rest_mama_ope',
      name: 'Smoky Party Jollof Feast',
      description: 'Iconic long grain rice',
      price: 3800.0,
      imageUrl: 'https://example.com/jollof.jpg',
      categoryId: 'cat_rice',
    );

    setUp(() {
      cartRepo = CartRepository();
    });

    test('Initial cart is empty', () {
      expect(cartRepo.items, isEmpty);
      expect(cartRepo.itemCount, 0);
      expect(cartRepo.subtotal, 0.0);
      expect(cartRepo.total, 0.0);
    });

    test('Adding item increments quantity and computes fees correctly', () {
      final item = CartItem(
        id: 'c1',
        foodItem: testFood,
        quantity: 1,
      );

      cartRepo.addItem(item);
      expect(cartRepo.itemCount, 1);
      expect(cartRepo.subtotal, 3800.0);
      expect(cartRepo.deliveryFee, AppConstants.standardDeliveryFee);
      expect(cartRepo.packagingFee, AppConstants.packagingFee);
      expect(cartRepo.serviceFee, AppConstants.serviceFee);

      // Total = 3800 + 650 + 150 + 200 = 4800
      expect(cartRepo.total, 3800.0 + 650.0 + 150.0 + 200.0);
    });

    test('Applying promo code BUKKA20 gives 20% discount on subtotal', () {
      final item = CartItem(
        id: 'c1',
        foodItem: testFood,
        quantity: 1, // 3800
      );

      cartRepo.addItem(item);
      final applied = cartRepo.applyPromoCode('BUKKA20');
      expect(applied, isTrue);
      expect(cartRepo.appliedPromoCode, 'BUKKA20');
      expect(cartRepo.promoDiscount, 3800.0 * 0.20); // 760
    });

    test('Free delivery applies when subtotal reaches threshold', () {
      final item = CartItem(
        id: 'c1',
        foodItem: testFood,
        quantity: 3, // 3800 * 3 = 11400 (>= 7500 threshold)
      );

      cartRepo.addItem(item);
      expect(cartRepo.subtotal, 11400.0);
      expect(cartRepo.deliveryFee, 0.0); // FREE
    });
  });
}
