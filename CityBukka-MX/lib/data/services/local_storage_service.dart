import '../mock_data/bukka_mock_data.dart';
import '../../domain/models/user_profile.dart';

/// Lightweight in-memory and local state storage manager.
class LocalStorageService {
  final Set<String> _favoriteFoodIds = {'food_jollof_fiesta', 'food_signature_suya'};
  final Set<String> _favoriteRestaurantIds = {'rest_mama_ope'};
  UserProfile _userProfile = BukkaMockData.initialUser;

  Set<String> get favoriteFoodIds => Set.unmodifiable(_favoriteFoodIds);
  Set<String> get favoriteRestaurantIds => Set.unmodifiable(_favoriteRestaurantIds);
  UserProfile get userProfile => _userProfile;

  bool isFoodFavorite(String foodId) => _favoriteFoodIds.contains(foodId);
  bool isRestaurantFavorite(String restaurantId) => _favoriteRestaurantIds.contains(restaurantId);

  void toggleFoodFavorite(String foodId) {
    if (_favoriteFoodIds.contains(foodId)) {
      _favoriteFoodIds.remove(foodId);
    } else {
      _favoriteFoodIds.add(foodId);
    }
  }

  void toggleRestaurantFavorite(String restaurantId) {
    if (_favoriteRestaurantIds.contains(restaurantId)) {
      _favoriteRestaurantIds.remove(restaurantId);
    } else {
      _favoriteRestaurantIds.add(restaurantId);
    }
  }

  void updateUserProfile(UserProfile updated) {
    _userProfile = updated;
  }
}
