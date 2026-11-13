import 'package:flutter/material.dart';
import '../../../../data/repositories/bukka_repository.dart';
import '../../../../domain/models/category.dart';
import '../../../../domain/models/food_item.dart';
import '../../../../domain/models/restaurant.dart';

class HomeViewModel extends ChangeNotifier {
  final BukkaRepository _repository;

  HomeViewModel({BukkaRepository? repository})
      : _repository = repository ?? BukkaRepository();

  bool _isLoading = true;
  String _selectedCategoryId = 'cat_all';
  String _searchQuery = '';
  List<FoodCategory> _categories = [];
  List<Restaurant> _restaurants = [];
  List<FoodItem> _popularDishes = [];
  List<FoodItem> _filteredDishes = [];

  bool get isLoading => _isLoading;
  String get selectedCategoryId => _selectedCategoryId;
  String get searchQuery => _searchQuery;
  List<FoodCategory> get categories => _categories;
  List<Restaurant> get restaurants => _restaurants;
  List<FoodItem> get popularDishes => _popularDishes;
  List<FoodItem> get filteredDishes => _filteredDishes;

  bool isFoodFavorite(String id) => _repository.isFoodFavorite(id);
  bool isRestaurantFavorite(String id) => _repository.isRestaurantFavorite(id);

  Future<void> loadInitialData() async {
    _isLoading = true;
    notifyListeners();

    try {
      final cats = await _repository.getCategories();
      final rests = await _repository.getRestaurants();
      final dishes = await _repository.getFoodItems(popularOnly: true);
      final allDishes = await _repository.getFoodItems();

      _categories = cats;
      _restaurants = rests;
      _popularDishes = dishes;
      _filteredDishes = allDishes;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> setCategory(String categoryId) async {
    _selectedCategoryId = categoryId;
    notifyListeners();
    await _applyFilters();
  }

  Future<void> setSearchQuery(String query) async {
    _searchQuery = query;
    notifyListeners();
    await _applyFilters();
  }

  Future<void> _applyFilters() async {
    _isLoading = true;
    notifyListeners();

    try {
      final dishes = await _repository.getFoodItems(
        categoryId: _selectedCategoryId == 'cat_all' ? null : _selectedCategoryId,
        searchQuery: _searchQuery.isEmpty ? null : _searchQuery,
      );
      final rests = await _repository.getRestaurants(
        query: _searchQuery.isEmpty ? null : _searchQuery,
      );

      _filteredDishes = dishes;
      _restaurants = rests;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void toggleFoodFavorite(String id) {
    _repository.toggleFoodFavorite(id);
    notifyListeners();
  }

  void toggleRestaurantFavorite(String id) {
    _repository.toggleRestaurantFavorite(id);
    notifyListeners();
  }
}
