import 'package:flutter/material.dart';
import 'package:citybukka_mx/core/theme/app_colors.dart';
import 'package:citybukka_mx/core/utils/currency_formatter.dart';
import 'package:citybukka_mx/domain/models/restaurant.dart';
import 'package:citybukka_mx/domain/models/food_item.dart';
import 'package:citybukka_mx/data/repositories/bukka_repository.dart';
import 'package:citybukka_mx/ui/core/widgets/rating_badge.dart';
import 'package:citybukka_mx/ui/core/widgets/food_item_card.dart';
import 'package:citybukka_mx/ui/features/cart/view_models/cart_view_model.dart';
import 'package:citybukka_mx/ui/features/cart/views/cart_screen.dart';
import 'package:citybukka_mx/ui/features/dish/views/dish_detail_screen.dart';

class RestaurantDetailScreen extends StatefulWidget {
  final Restaurant restaurant;
  final CartViewModel cartViewModel;
  final BukkaRepository bukkaRepository;

  const RestaurantDetailScreen({
    super.key,
    required this.restaurant,
    required this.cartViewModel,
    required this.bukkaRepository,
  });

  @override
  State<RestaurantDetailScreen> createState() => _RestaurantDetailScreenState();
}

class _RestaurantDetailScreenState extends State<RestaurantDetailScreen> {
  List<FoodItem> _menuItems = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMenu();
  }

  Future<void> _loadMenu() async {
    final items = await widget.bukkaRepository.getFoodItems(
      restaurantId: widget.restaurant.id,
    );
    if (mounted) {
      setState(() {
        _menuItems = items;
        _isLoading = false;
      });
    }
  }

  void _openDishDetail(FoodItem item) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => DishDetailScreen(
          foodItem: item,
          cartViewModel: widget.cartViewModel,
          isFavorite: widget.bukkaRepository.isFoodFavorite(item.id),
          onToggleFavorite: () {
            widget.bukkaRepository.toggleFoodFavorite(item.id);
            setState(() {});
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              // Hero Cover
              SliverAppBar(
                expandedHeight: 240,
                pinned: true,
                leading: CircleAvatar(
                  backgroundColor: Colors.black.withOpacity(0.5),
                  child: IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ),
                flexibleSpace: FlexibleSpaceBar(
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.network(
                        widget.restaurant.coverImageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          color: AppColors.cardDark,
                          child: const Icon(Icons.storefront, size: 60, color: AppColors.primary),
                        ),
                      ),
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withOpacity(0.4),
                              Colors.transparent,
                              Colors.black.withOpacity(0.7),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Restaurant Info Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.restaurant.name,
                                  style: const TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  widget.restaurant.tagline,
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          RatingBadge(
                            rating: widget.restaurant.rating,
                            reviewCount: widget.restaurant.reviewCount,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Delivery and Distance Stats Card
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.cardDark : AppColors.cardLight,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isDark ? AppColors.dividerDark : AppColors.dividerLight,
                            width: 0.8,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildMetaCol(
                              icon: Icons.access_time_filled,
                              title: widget.restaurant.deliveryTimeFormatted,
                              subtitle: 'Delivery Time',
                            ),
                            Container(height: 28, width: 1, color: isDark ? AppColors.dividerDark : AppColors.dividerLight),
                            _buildMetaCol(
                              icon: Icons.delivery_dining,
                              title: CurrencyFormatter.format(widget.restaurant.deliveryFee),
                              subtitle: 'Delivery Fee',
                            ),
                            Container(height: 28, width: 1, color: isDark ? AppColors.dividerDark : AppColors.dividerLight),
                            _buildMetaCol(
                              icon: Icons.place,
                              title: '${widget.restaurant.distanceKm} km',
                              subtitle: 'Distance',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Description
                      Text(
                        widget.restaurant.description,
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Section Title: Bukka Menu
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Bukka Specialties',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                          ),
                          Text(
                            '${_menuItems.length} items',
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              ),

              // Menu Items List
              if (_isLoading)
                const SliverToBoxAdapter(
                  child: Center(
                    child: Padding(
                      padding: EdgeInsets.all(40),
                      child: CircularProgressIndicator(),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final item = _menuItems[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 14),
                          child: FoodItemCard(
                            item: item,
                            onTap: () => _openDishDetail(item),
                            onAddToCart: () => _openDishDetail(item),
                            isFavorite: widget.bukkaRepository.isFoodFavorite(item.id),
                            onToggleFavorite: () {
                              widget.bukkaRepository.toggleFoodFavorite(item.id);
                              setState(() {});
                            },
                          ),
                        );
                      },
                      childCount: _menuItems.length,
                    ),
                  ),
                ),

              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ),

          // Floating Cart Indicator if items in cart
          ListenableBuilder(
            listenable: widget.cartViewModel,
            builder: (context, _) {
              if (widget.cartViewModel.itemCount == 0) return const SizedBox.shrink();

              return Positioned(
                bottom: 16,
                left: 16,
                right: 16,
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => CartScreen(
                            cartViewModel: widget.cartViewModel,
                            bukkaRepository: widget.bukkaRepository,
                          ),
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withOpacity(0.4),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          )
                        ],
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.2),
                                  shape: BoxShape.circle,
                                ),
                                child: Text(
                                  '${widget.cartViewModel.itemCount}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              const Text(
                                'View Bag',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 15,
                                ),
                              ),
                            ],
                          ),
                          Row(
                            children: [
                              Text(
                                CurrencyFormatter.format(widget.cartViewModel.total),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(width: 6),
                              const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 18),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMetaCol({required IconData icon, required String title, required String subtitle}) {
    return Column(
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(height: 4),
        Text(
          title,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
        ),
        Text(
          subtitle,
          style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
        ),
      ],
    );
  }
}
