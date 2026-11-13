import 'package:flutter/material.dart';
import 'package:citybukka_mx/core/theme/app_colors.dart';
import 'package:citybukka_mx/core/utils/currency_formatter.dart';
import 'package:citybukka_mx/domain/models/food_item.dart';
import 'package:citybukka_mx/domain/models/cart_item.dart';
import 'package:citybukka_mx/ui/core/widgets/rating_badge.dart';
import 'package:citybukka_mx/ui/core/widgets/quantity_selector.dart';
import 'package:citybukka_mx/ui/core/widgets/custom_button.dart';
import 'package:citybukka_mx/ui/features/cart/view_models/cart_view_model.dart';

class DishDetailScreen extends StatefulWidget {
  final FoodItem foodItem;
  final CartViewModel cartViewModel;
  final bool isFavorite;
  final VoidCallback onToggleFavorite;

  const DishDetailScreen({
    super.key,
    required this.foodItem,
    required this.cartViewModel,
    this.isFavorite = false,
    required this.onToggleFavorite,
  });

  @override
  State<DishDetailScreen> createState() => _DishDetailScreenState();
}

class _DishDetailScreenState extends State<DishDetailScreen> {
  int _quantity = 1;
  final Map<String, List<CustomizationOption>> _selectedOptions = {};
  final TextEditingController _instructionController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Pre-select defaults for required groups
    for (final group in widget.foodItem.customizationGroups) {
      if (group.isRequired && group.options.isNotEmpty) {
        _selectedOptions[group.id] = [group.options.first];
      } else {
        _selectedOptions[group.id] = [];
      }
    }
  }

  @override
  void dispose() {
    _instructionController.dispose();
    super.dispose();
  }

  double get _currentUnitPrice {
    double extra = 0.0;
    _selectedOptions.forEach((_, list) {
      for (final opt in list) {
        extra += opt.extraPrice;
      }
    });
    return widget.foodItem.price + extra;
  }

  double get _currentTotalPrice => _currentUnitPrice * _quantity;

  void _onOptionToggled(CustomizationGroup group, CustomizationOption option) {
    setState(() {
      final currentList = _selectedOptions[group.id] ?? [];
      if (group.maxSelectable == 1) {
        _selectedOptions[group.id] = [option];
      } else {
        if (currentList.any((o) => o.id == option.id)) {
          currentList.removeWhere((o) => o.id == option.id);
        } else {
          if (currentList.length < group.maxSelectable) {
            currentList.add(option);
          }
        }
        _selectedOptions[group.id] = currentList;
      }
    });
  }

  void _addToCart() {
    final allSelected = <CustomizationOption>[];
    _selectedOptions.forEach((_, opts) => allSelected.addAll(opts));

    final cartItem = CartItem(
      id: '${widget.foodItem.id}_${DateTime.now().millisecondsSinceEpoch}',
      foodItem: widget.foodItem,
      quantity: _quantity,
      selectedOptions: allSelected,
      specialInstructions: _instructionController.text.trim(),
    );

    widget.cartViewModel.addItem(cartItem);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppColors.accentGreen,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        content: Row(
          children: [
            const Icon(Icons.check_circle_outline, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Added ${widget.foodItem.name} to your Bukka bag!',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        duration: const Duration(seconds: 2),
      ),
    );

    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Collapsible App Bar with Image
          SliverAppBar(
            expandedHeight: 280,
            pinned: true,
            leading: CircleAvatar(
              backgroundColor: Colors.black.withOpacity(0.5),
              child: IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
            actions: [
              CircleAvatar(
                backgroundColor: Colors.black.withOpacity(0.5),
                child: IconButton(
                  icon: Icon(
                    widget.isFavorite ? Icons.favorite : Icons.favorite_border,
                    color: widget.isFavorite ? Colors.redAccent : Colors.white,
                  ),
                  onPressed: widget.onToggleFavorite,
                ),
              ),
              const SizedBox(width: 12),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  Image.network(
                    widget.foodItem.imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: AppColors.cardDark,
                      child: const Center(
                        child: Icon(Icons.restaurant, size: 64, color: AppColors.primary),
                      ),
                    ),
                  ),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withOpacity(0.3),
                          Colors.transparent,
                          Colors.black.withOpacity(0.6),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Dish Content Details
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title and Rating
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          widget.foodItem.name,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            height: 1.25,
                          ),
                        ),
                      ),
                      RatingBadge(
                        rating: widget.foodItem.rating,
                        reviewCount: widget.foodItem.reviewCount,
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Metadata Pills (Prep time, Calories, Spice level)
                  Row(
                    children: [
                      _buildInfoPill(
                        icon: Icons.timer_outlined,
                        text: '${widget.foodItem.prepTimeMinutes} mins',
                        isDark: isDark,
                      ),
                      const SizedBox(width: 8),
                      _buildInfoPill(
                        icon: Icons.local_fire_department_outlined,
                        text: '${widget.foodItem.calories} kcal',
                        isDark: isDark,
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          widget.foodItem.spiceLevel.label,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primaryDark,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  // Description
                  Text(
                    widget.foodItem.description,
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      height: 1.6,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Customization Groups
                  for (final group in widget.foodItem.customizationGroups) ...[
                    _buildCustomizationGroup(group, isDark),
                    const SizedBox(height: 20),
                  ],

                  // Special Instructions
                  const Text(
                    'Special Instructions',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _instructionController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      hintText: 'e.g. Extra spicy, no onions, pack soup separately...',
                      fillColor: isDark ? AppColors.cardDark : AppColors.cardLight,
                    ),
                  ),
                  const SizedBox(height: 100), // Spacing for bottom bar
                ],
              ),
            ),
          ),
        ],
      ),

      // Bottom Sticky Order Bar
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          border: Border(
            top: BorderSide(
              color: isDark ? AppColors.dividerDark : AppColors.dividerLight,
              width: 1,
            ),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 16,
              offset: const Offset(0, -4),
            )
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [
              QuantitySelector(
                quantity: _quantity,
                onChanged: (val) => setState(() => _quantity = val),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: CustomButton(
                  text: 'Add to Bag • ${CurrencyFormatter.format(_currentTotalPrice)}',
                  onPressed: _addToCart,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoPill({required IconData icon, required String text, required bool isDark}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : AppColors.cardLight,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.primary),
          const SizedBox(width: 4),
          Text(
            text,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomizationGroup(CustomizationGroup group, bool isDark) {
    final selected = _selectedOptions[group.id] ?? [];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : AppColors.cardLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.dividerDark : AppColors.dividerLight,
          width: 0.8,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                group.name,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: group.isRequired
                      ? AppColors.primary.withOpacity(0.15)
                      : Colors.grey.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  group.isRequired ? 'REQUIRED' : 'OPTIONAL',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: group.isRequired ? AppColors.primary : Colors.grey.shade600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          for (final option in group.options) ...[
            InkWell(
              onTap: () => _onOptionToggled(group, option),
              borderRadius: BorderRadius.circular(10),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  children: [
                    Icon(
                      group.maxSelectable == 1
                          ? (selected.any((o) => o.id == option.id)
                              ? Icons.radio_button_checked
                              : Icons.radio_button_unchecked)
                          : (selected.any((o) => o.id == option.id)
                              ? Icons.check_box
                              : Icons.check_box_outline_blank),
                      color: selected.any((o) => o.id == option.id)
                          ? AppColors.primary
                          : Colors.grey.shade400,
                      size: 20,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        option.name,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                      ),
                    ),
                    if (option.extraPrice > 0)
                      Text(
                        '+${CurrencyFormatter.format(option.extraPrice)}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
