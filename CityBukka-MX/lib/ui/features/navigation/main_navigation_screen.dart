import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/repositories/bukka_repository.dart';
import '../../../data/repositories/cart_repository.dart';
import '../../../data/repositories/order_repository.dart';
import '../home/view_models/home_view_model.dart';
import '../home/views/home_screen.dart';
import '../favorites/views/favorites_screen.dart';
import '../cart/view_models/cart_view_model.dart';
import '../cart/views/cart_screen.dart';
import '../orders/view_models/orders_view_model.dart';
import '../orders/views/orders_screen.dart';
import '../profile/views/profile_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  final int initialIndex;
  final ValueChanged<bool>? onThemeChanged;
  final bool isDarkMode;

  const MainNavigationScreen({
    super.key,
    this.initialIndex = 0,
    this.onThemeChanged,
    this.isDarkMode = true,
  });

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  late int _currentIndex;

  // Singletons across feature screens
  late final BukkaRepository _bukkaRepository;
  late final CartRepository _cartRepository;
  late final OrderRepository _orderRepository;

  late final HomeViewModel _homeViewModel;
  late final CartViewModel _cartViewModel;
  late final OrdersViewModel _ordersViewModel;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;

    _bukkaRepository = BukkaRepository();
    _cartRepository = CartRepository();
    _orderRepository = OrderRepository();

    _homeViewModel = HomeViewModel(repository: _bukkaRepository);
    _cartViewModel = CartViewModel(repository: _cartRepository);
    _ordersViewModel = OrdersViewModel(repository: _orderRepository);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: [
          HomeScreen(
            homeViewModel: _homeViewModel,
            cartViewModel: _cartViewModel,
            bukkaRepository: _bukkaRepository,
          ),
          FavoritesScreen(
            bukkaRepository: _bukkaRepository,
            cartViewModel: _cartViewModel,
          ),
          OrdersScreen(
            ordersViewModel: _ordersViewModel,
          ),
          CartScreen(
            cartViewModel: _cartViewModel,
            bukkaRepository: _bukkaRepository,
          ),
          ProfileScreen(
            onThemeChanged: widget.onThemeChanged,
            isDarkMode: widget.isDarkMode,
          ),
        ],
      ),
      bottomNavigationBar: ListenableBuilder(
        listenable: _cartViewModel,
        builder: (context, _) {
          return NavigationBar(
            selectedIndex: _currentIndex,
            onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
            indicatorColor: AppColors.accentGreen.withValues(alpha: 0.18),
            destinations: [
              const NavigationDestination(
                icon: Icon(Icons.storefront_outlined),
                selectedIcon: Icon(Icons.storefront, color: AppColors.accentGreen),
                label: 'Explore',
              ),
              const NavigationDestination(
                icon: Icon(Icons.favorite_border),
                selectedIcon: Icon(Icons.favorite, color: AppColors.accentGreen),
                label: 'Saved',
              ),
              const NavigationDestination(
                icon: Icon(Icons.receipt_long_outlined),
                selectedIcon: Icon(Icons.receipt_long, color: AppColors.accentGreen),
                label: 'Orders',
              ),
              NavigationDestination(
                icon: Badge(
                  isLabelVisible: _cartViewModel.itemCount > 0,
                  label: Text('${_cartViewModel.itemCount}'),
                  backgroundColor: AppColors.accentGreen,
                  child: const Icon(Icons.shopping_bag_outlined),
                ),
                selectedIcon: Badge(
                  isLabelVisible: _cartViewModel.itemCount > 0,
                  label: Text('${_cartViewModel.itemCount}'),
                  backgroundColor: AppColors.accentGreen,
                  child: const Icon(Icons.shopping_bag, color: AppColors.accentGreen),
                ),
                label: 'Bag',
              ),
              const NavigationDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person, color: AppColors.accentGreen),
                label: 'Profile',
              ),
            ],
          );
        },
      ),
    );
  }
}
