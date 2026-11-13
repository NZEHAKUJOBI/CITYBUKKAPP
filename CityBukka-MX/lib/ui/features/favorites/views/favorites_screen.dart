import 'package:flutter/material.dart';
import 'package:citybukka_mx/core/theme/app_colors.dart';
import 'package:citybukka_mx/data/repositories/bukka_repository.dart';
import 'package:citybukka_mx/domain/models/food_item.dart';
import 'package:citybukka_mx/domain/models/restaurant.dart';
import 'package:citybukka_mx/ui/core/widgets/food_item_card.dart';
import 'package:citybukka_mx/ui/core/widgets/restaurant_card.dart';
import 'package:citybukka_mx/ui/core/widgets/empty_state_view.dart';
import 'package:citybukka_mx/ui/features/cart/view_models/cart_view_model.dart';
import 'package:citybukka_mx/ui/features/dish/views/dish_detail_screen.dart';
import 'package:citybukka_mx/ui/features/restaurant/views/restaurant_detail_screen.dart';

class FavoritesScreen extends StatefulWidget {
  final BukkaRepository bukkaRepository;
  final CartViewModel cartViewModel;

  const FavoritesScreen({
    super.key,
    required this.bukkaRepository,
    required this.cartViewModel,
  });

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  List<FoodItem> _favoriteDishes = [];
  List<Restaurant> _favoriteRestaurants = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadFavorites();
  }

  Future<void> _loadFavorites() async {
    final dishes = await widget.bukkaRepository.getFavoriteFoodItems();
    final rests = await widget.bukkaRepository.getFavoriteRestaurants();
    if (mounted) {
      setState(() {
        _favoriteDishes = dishes;
        _favoriteRestaurants = rests;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Saved Cravings'),
          bottom: TabBar(
            indicatorColor: AppColors.primary,
            indicatorWeight: 3,
            labelColor: AppColors.primary,
            unselectedLabelColor: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
            tabs: const [
              Tab(text: 'Favorite Dishes'),
              Tab(text: 'Bookmarked Bukkas'),
            ],
          ),
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : TabBarView(
                children: [
                  // Favorite Dishes Tab
                  _favoriteDishes.isEmpty
                      ? const EmptyStateView(
                          icon: Icons.favorite_border_rounded,
                          title: 'No Favorite Dishes Yet',
                          message: 'Tap the heart icon on any spicy jollof or soup to save it here for quick ordering.',
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(18),
                          itemCount: _favoriteDishes.length,
                          itemBuilder: (context, index) {
                            final item = _favoriteDishes[index];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 14),
                              child: FoodItemCard(
                                item: item,
                                onTap: () => _openDish(item),
                                onAddToCart: () => _openDish(item),
                                isFavorite: true,
                                onToggleFavorite: () {
                                  widget.bukkaRepository.toggleFoodFavorite(item.id);
                                  _loadFavorites();
                                },
                              ),
                            );
                          },
                        ),

                  // Favorite Restaurants Tab
                  _favoriteRestaurants.isEmpty
                      ? const EmptyStateView(
                          icon: Icons.storefront_outlined,
                          title: 'No Bookmarked Bukkas',
                          message: 'Bookmark your top local eateries to keep tabs on their daily specials.',
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(18),
                          itemCount: _favoriteRestaurants.length,
                          itemBuilder: (context, index) {
                            final rest = _favoriteRestaurants[index];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: RestaurantCard(
                                restaurant: rest,
                                onTap: () => _openRestaurant(rest),
                                isFavorite: true,
                                onToggleFavorite: () {
                                  widget.bukkaRepository.toggleRestaurantFavorite(rest.id);
                                  _loadFavorites();
                                },
                              ),
                            );
                          },
                        ),
                ],
              ),
      ),
    );
  }

  void _openDish(FoodItem item) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => DishDetailScreen(
          foodItem: item,
          cartViewModel: widget.cartViewModel,
          isFavorite: true,
          onToggleFavorite: () {
            widget.bukkaRepository.toggleFoodFavorite(item.id);
            _loadFavorites();
          },
        ),
      ),
    );
  }

  void _openRestaurant(Restaurant restaurant) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => RestaurantDetailScreen(
          restaurant: restaurant,
          cartViewModel: widget.cartViewModel,
          bukkaRepository: widget.bukkaRepository,
        ),
      ),
    );
  }
}
