import '../mock_data/bukka_mock_data.dart';
import '../../domain/models/category.dart';
import '../../domain/models/food_item.dart';
import '../../domain/models/restaurant.dart';
import '../../domain/models/order.dart';

/// Simulates a backend API client with asynchronous responses.
class BukkaApiService {
  Future<List<Restaurant>> fetchRestaurants({String? query, String? cuisine}) async {
    await Future.delayed(const Duration(milliseconds: 300));
    var results = BukkaMockData.restaurants;

    if (query != null && query.trim().isNotEmpty) {
      final q = query.trim().toLowerCase();
      results = results.where((r) {
        final matchesName = r.name.toLowerCase().contains(q);
        final matchesCuisine = r.cuisines.any((c) => c.toLowerCase().contains(q));
        final matchesTagline = r.tagline.toLowerCase().contains(q);
        return matchesName || matchesCuisine || matchesTagline;
      }).toList();
    }

    if (cuisine != null && cuisine.isNotEmpty && cuisine != 'All') {
      results = results.where((r) => r.cuisines.contains(cuisine)).toList();
    }

    return results;
  }

  Future<Restaurant?> getRestaurantById(String id) async {
    await Future.delayed(const Duration(milliseconds: 150));
    try {
      return BukkaMockData.restaurants.firstWhere((r) => r.id == id);
    } catch (_) {
      return null;
    }
  }

  Future<List<FoodCategory>> fetchCategories() async {
    await Future.delayed(const Duration(milliseconds: 100));
    return BukkaMockData.categories;
  }

  Future<List<FoodItem>> fetchFoodItems({
    String? categoryId,
    String? restaurantId,
    String? searchQuery,
    bool? popularOnly,
  }) async {
    await Future.delayed(const Duration(milliseconds: 250));
    var results = BukkaMockData.foodItems;

    if (restaurantId != null) {
      results = results.where((f) => f.restaurantId == restaurantId).toList();
    }

    if (categoryId != null && categoryId != 'cat_all') {
      results = results.where((f) => f.categoryId == categoryId).toList();
    }

    if (popularOnly == true) {
      results = results.where((f) => f.isPopular).toList();
    }

    if (searchQuery != null && searchQuery.trim().isNotEmpty) {
      final q = searchQuery.trim().toLowerCase();
      results = results.where((f) {
        final matchesName = f.name.toLowerCase().contains(q);
        final matchesDesc = f.description.toLowerCase().contains(q);
        return matchesName || matchesDesc;
      }).toList();
    }

    return results;
  }

  Future<FoodItem?> getFoodItemById(String id) async {
    await Future.delayed(const Duration(milliseconds: 150));
    try {
      return BukkaMockData.foodItems.firstWhere((f) => f.id == id);
    } catch (_) {
      return null;
    }
  }

  Future<Order> createOrder(Order order) async {
    await Future.delayed(const Duration(milliseconds: 600));
    return order;
  }
}
