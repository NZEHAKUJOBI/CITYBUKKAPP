import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:citybukka_mx/core/constants/app_constants.dart';
import 'package:citybukka_mx/core/theme/app_colors.dart';
import 'package:citybukka_mx/data/repositories/bukka_repository.dart';
import 'package:citybukka_mx/domain/models/food_item.dart';
import 'package:citybukka_mx/domain/models/restaurant.dart';
import 'package:citybukka_mx/ui/core/widgets/faded_app_header.dart';
import 'package:citybukka_mx/ui/core/widgets/search_bar_widget.dart';
import 'package:citybukka_mx/ui/core/widgets/category_chip.dart';
import 'package:citybukka_mx/ui/core/widgets/food_item_card.dart';
import 'package:citybukka_mx/ui/core/widgets/restaurant_card.dart';
import 'package:citybukka_mx/ui/core/widgets/promo_banner_card.dart';
import 'package:citybukka_mx/ui/core/widgets/empty_state_view.dart';
import 'package:citybukka_mx/ui/features/home/view_models/home_view_model.dart';
import 'package:citybukka_mx/ui/features/cart/view_models/cart_view_model.dart';
import 'package:citybukka_mx/ui/features/dish/views/dish_detail_screen.dart';
import 'package:citybukka_mx/ui/features/restaurant/views/restaurant_detail_screen.dart';

class HomeScreen extends StatefulWidget {
  final HomeViewModel homeViewModel;
  final CartViewModel cartViewModel;
  final BukkaRepository bukkaRepository;

  const HomeScreen({
    super.key,
    required this.homeViewModel,
    required this.cartViewModel,
    required this.bukkaRepository,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    widget.homeViewModel.loadInitialData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openDishDetail(FoodItem item) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => DishDetailScreen(
          foodItem: item,
          cartViewModel: widget.cartViewModel,
          isFavorite: widget.homeViewModel.isFoodFavorite(item.id),
          onToggleFavorite: () => widget.homeViewModel.toggleFoodFavorite(item.id),
        ),
      ),
    );
  }

  void _openRestaurantDetail(Restaurant rest) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => RestaurantDetailScreen(
          restaurant: rest,
          cartViewModel: widget.cartViewModel,
          bukkaRepository: widget.bukkaRepository,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final bgColor = theme.scaffoldBackgroundColor;

    return Scaffold(
      backgroundColor: bgColor,
      body: Stack(
        children: [
          // 1. Full-screen ambient background banner
          Positioned.fill(
            child: Opacity(
              opacity: isDark ? 0.22 : 0.12,
              child: Image.asset(
                AppConstants.headerBanner,
                fit: BoxFit.cover,
                alignment: Alignment.center,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),
          ),

          // 2. Crisp, uncropped top banner backdrop
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 250,
            child: Opacity(
              opacity: isDark ? 0.38 : 0.22,
              child: Image.asset(
                AppConstants.headerBanner,
                fit: BoxFit.fitWidth,
                alignment: Alignment.topCenter,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),
          ),

          // 3. Multi-stop vertical ambient gradient overlay
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    bgColor.withValues(alpha: isDark ? 0.35 : 0.55),
                    bgColor.withValues(alpha: isDark ? 0.65 : 0.78),
                    bgColor.withValues(alpha: isDark ? 0.88 : 0.94),
                    bgColor.withValues(alpha: isDark ? 0.95 : 0.98),
                  ],
                  stops: const [0.0, 0.28, 0.65, 1.0],
                ),
              ),
            ),
          ),

          // 4. Foreground Content
          SafeArea(
            top: false,
            child: ListenableBuilder(
              listenable: widget.homeViewModel,
              builder: (context, _) {
                if (widget.homeViewModel.isLoading && widget.homeViewModel.categories.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                return RefreshIndicator(
                  onRefresh: () => widget.homeViewModel.loadInitialData(),
                  color: AppColors.primary,
                  child: CustomScrollView(
                    slivers: [
                      // Header (Location + Actions + Search Bar over full background)
                      SliverToBoxAdapter(
                        child: FadedAppHeader(
                          transparentBackground: true,
                          searchController: _searchController,
                          onSearchChanged: (val) => widget.homeViewModel.setSearchQuery(val),
                          onFilterTap: () => _showFilterSheet(context),
                          onNotificationTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('No new notifications right now.')),
                            );
                          },
                          onGrabAndGoTap: () => _showGrabAndGoSheet(context),
                        ),
                      ),

                  // Promo Banner
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 10, 20, 16),
                      child: PromoBannerCard(
                        code: 'BUKKA20',
                        title: '20% Off Your First Bukka Feast!',
                        subtitle: 'Use code BUKKA20 at checkout on orders above ₦3,000.',
                        onApply: () {
                          widget.cartViewModel.applyPromoCode('BUKKA20');
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              backgroundColor: AppColors.accentGreen,
                              content: Text('Promo code BUKKA20 copied & applied to your bag!'),
                            ),
                          );
                        },
                      ),
                    ),
                  ),

                  // Category Selector Chips
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 42,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: widget.homeViewModel.categories.length,
                        itemBuilder: (context, index) {
                          final cat = widget.homeViewModel.categories[index];
                          return CategoryChip(
                            category: cat,
                            isSelected: widget.homeViewModel.selectedCategoryId == cat.id,
                            onTap: () => widget.homeViewModel.setCategory(cat.id),
                          );
                        },
                      ),
                    ),
                  ),

                  // Section Title: Featured Bukkas
                  if (widget.homeViewModel.searchQuery.isEmpty &&
                      widget.homeViewModel.selectedCategoryId == 'cat_all') ...[
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Top Bukkas Near You 🔥',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                            ),
                            Text(
                              'View All',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Horizontal Bukka Restaurants Carousel
                    SliverToBoxAdapter(
                      child: SizedBox(
                        height: 272,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          itemCount: widget.homeViewModel.restaurants.length,
                          itemBuilder: (context, index) {
                            final rest = widget.homeViewModel.restaurants[index];
                            return Container(
                              width: 280,
                              margin: const EdgeInsets.only(right: 14),
                              child: RestaurantCard(
                                restaurant: rest,
                                onTap: () => _openRestaurantDetail(rest),
                                isFavorite: widget.homeViewModel.isRestaurantFavorite(rest.id),
                                onToggleFavorite: () => widget.homeViewModel.toggleRestaurantFavorite(rest.id),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  ],

                  // Section Title: Popular or Filtered Dishes
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            widget.homeViewModel.searchQuery.isNotEmpty
                                ? 'Search Results (${widget.homeViewModel.filteredDishes.length})'
                                : 'Trending Cravings 🍲',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                          ),
                          if (widget.homeViewModel.searchQuery.isEmpty)
                            Text(
                              '${widget.homeViewModel.filteredDishes.length} items',
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),

                  // Food Items List / Grid
                  if (widget.homeViewModel.filteredDishes.isEmpty)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(40),
                        child: EmptyStateView(
                          icon: Icons.search_off_rounded,
                          title: 'No Dishes Found',
                          message: 'Try searching for another dish or reset your active category filter.',
                          buttonText: 'Reset Filters',
                          onButtonPressed: () {
                            _searchController.clear();
                            widget.homeViewModel.setSearchQuery('');
                            widget.homeViewModel.setCategory('cat_all');
                          },
                        ),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final dish = widget.homeViewModel.filteredDishes[index];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 14),
                              child: FoodItemCard(
                                item: dish,
                                onTap: () => _openDishDetail(dish),
                                onAddToCart: () => _openDishDetail(dish),
                                isFavorite: widget.homeViewModel.isFoodFavorite(dish.id),
                                onToggleFavorite: () => widget.homeViewModel.toggleFoodFavorite(dish.id),
                              ),
                            );
                          },
                          childCount: widget.homeViewModel.filteredDishes.length,
                        ),
                      ),
                    ),

                  const SliverToBoxAdapter(child: SizedBox(height: 80)),
                ],
              ),
            );
          },
        ),
      ),
    ],
  ),
);
  }

  void _showFilterSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Filter by Cuisine & Speed', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _buildFilterChip('Under 30 Mins'),
                _buildFilterChip('Rating 4.8+'),
                _buildFilterChip('Woodfire Bukka'),
                _buildFilterChip('Halal Certified'),
                _buildFilterChip('Bukka Fire Spicy'),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Apply Filters'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label) {
    return FilterChip(
      label: Text(label),
      onSelected: (_) {},
      selected: false,
      selectedColor: AppColors.primaryLight.withOpacity(0.3),
    );
  }

  void _showGrabAndGoSheet(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border.all(
            color: isDark ? AppColors.dividerDark : AppColors.dividerLight,
            width: 1,
          ),
        ),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag Handle
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? Colors.white24 : Colors.black12,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Branded Banner Header Card
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Stack(
                children: [
                  Image.asset(
                    AppConstants.headerBanner,
                    width: double.infinity,
                    height: 110,
                    fit: BoxFit.cover,
                  ),
                  Container(
                    width: double.infinity,
                    height: 110,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withValues(alpha: 0.1),
                          Colors.black.withValues(alpha: 0.8),
                        ],
                      ),
                    ),
                  ),
                  const Positioned(
                    bottom: 12,
                    left: 14,
                    right: 14,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '⚡ GRAB & GO HOTLINES',
                          style: TextStyle(
                            color: AppColors.secondary,
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1,
                          ),
                        ),
                        Text(
                          'Minna Express',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),
            const Text(
              'Call for Fast Takeout & Bulk Orders',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              'Order ahead, skip the queue, or arrange office lunch trays and event catering.',
              style: TextStyle(
                fontSize: 12.5,
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                height: 1.35,
              ),
            ),

            const SizedBox(height: 16),

            // Hotline Numbers
            _buildHotlineTile(
              context: ctx,
              title: 'Primary Grab & Go Hotline',
              phone: AppConstants.grabAndGoPhone1,
              isDark: isDark,
            ),
            const SizedBox(height: 10),
            _buildHotlineTile(
              context: ctx,
              title: 'Catering & Bulk Office Orders',
              phone: AppConstants.grabAndGoPhone2,
              isDark: isDark,
            ),

            const SizedBox(height: 18),

            // Services Grid
            const Text(
              'Featured Bukka Services',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _buildServicePill(Icons.takeout_dining_rounded, 'Take Out', isDark),
                _buildServicePill(Icons.dinner_dining_rounded, 'Event & Catering', isDark),
                _buildServicePill(Icons.inventory_2_outlined, 'Food Trays', isDark),
                _buildServicePill(Icons.work_outline_rounded, 'Office Lunch', isDark),
                _buildServicePill(Icons.all_inbox_rounded, 'Food Packs', isDark),
                _buildServicePill(Icons.local_drink_rounded, 'Natural Drinks', isDark),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHotlineTile({
    required BuildContext context,
    required String title,
    required String phone,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : AppColors.cardLight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? AppColors.dividerDark : AppColors.dividerLight,
          width: 0.8,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.phone_rounded, color: AppColors.secondary, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
                Text(
                  phone,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
          TextButton.icon(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: phone));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Copied $phone to clipboard!'),
                  duration: const Duration(seconds: 2),
                ),
              );
            },
            icon: const Icon(Icons.copy_rounded, size: 14),
            label: const Text('Copy'),
            style: TextButton.styleFrom(
              foregroundColor: AppColors.secondary,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildServicePill(IconData icon, String label, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : AppColors.cardLight,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppColors.dividerDark : AppColors.dividerLight,
          width: 0.8,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.primaryLight),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
