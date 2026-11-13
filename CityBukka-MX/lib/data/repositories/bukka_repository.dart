import '../services/bukka_api_service.dart';
import '../services/local_storage_service.dart';
import '../../domain/models/category.dart';
import '../../domain/models/food_item.dart';
import '../../domain/models/restaurant.dart';

class BukkaRepository {
  final BukkaApiService _apiService;
  final LocalStorageService _storageService;

  BukkaRepository({
    BukkaApiService? apiService,
    LocalStorageService? storageService,
  })  : _apiService = apiService ?? BukkaApiService(),
        _storageService = storageService ?? LocalStorageService();

  Future<List<Restaurant>> getRestaurants({String? query, String? cuisine}) =>
      _apiService.fetchRestaurants(query: query, cuisine: cuisine);

  Future<Restaurant?> getRestaurant(String id) => _apiService.getRestaurantById(id);

  Future<List<FoodCategory>> getCategories() => _apiService.fetchCategories();

  Future<List<FoodItem>> getFoodItems({
    String? categoryId,
    String? restaurantId,
    String? searchQuery,
    bool? popularOnly,
  }) =>
      _apiService.fetchFoodItems(
        categoryId: categoryId,
        restaurantId: restaurantId,
        searchQuery: searchQuery,
        popularOnly: popularOnly,
      );

  Future<FoodItem?> getFoodItem(String id) => _apiService.getFoodItemById(id);

  bool isFoodFavorite(String id) => _storageService.isFoodFavorite(id);
  bool isRestaurantFavorite(String id) => _storageService.isRestaurantFavorite(id);

  void toggleFoodFavorite(String id) => _storageService.toggleFoodFavorite(id);
  void toggleRestaurantFavorite(String id) => _storageService.toggleRestaurantFavorite(id);

  Future<List<FoodItem>> getFavoriteFoodItems() async {
    final all = await _apiService.fetchFoodItems();
    final ids = _storageService.favoriteFoodIds;
    return all.where((item) => ids.contains(item.id)).toList();
  }

  Future<List<Restaurant>> getFavoriteRestaurants() async {
    final all = await _apiService.fetchRestaurants();
    final ids = _storageService.favoriteRestaurantIds;
    return all.where((rest) => ids.contains(rest.id)).toList();
  }
}
