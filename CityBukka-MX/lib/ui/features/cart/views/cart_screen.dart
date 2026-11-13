import 'package:flutter/material.dart';
import 'package:citybukka_mx/core/theme/app_colors.dart';
import 'package:citybukka_mx/core/utils/currency_formatter.dart';
import 'package:citybukka_mx/core/constants/app_constants.dart';
import 'package:citybukka_mx/data/repositories/bukka_repository.dart';
import 'package:citybukka_mx/ui/core/widgets/quantity_selector.dart';
import 'package:citybukka_mx/ui/core/widgets/custom_button.dart';
import 'package:citybukka_mx/ui/core/widgets/empty_state_view.dart';
import 'package:citybukka_mx/ui/features/cart/view_models/cart_view_model.dart';
import 'checkout_screen.dart';

class CartScreen extends StatefulWidget {
  final CartViewModel cartViewModel;
  final BukkaRepository bukkaRepository;

  const CartScreen({
    super.key,
    required this.cartViewModel,
    required this.bukkaRepository,
  });

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final TextEditingController _promoController = TextEditingController();
  String? _promoMessage;
  bool _promoError = false;

  @override
  void dispose() {
    _promoController.dispose();
    super.dispose();
  }

  void _applyPromo() {
    final code = _promoController.text.trim();
    if (code.isEmpty) return;

    final success = widget.cartViewModel.applyPromoCode(code);
    setState(() {
      if (success) {
        _promoMessage = 'Promo code $code applied successfully! 🎉';
        _promoError = false;
      } else {
        _promoMessage = 'Invalid promo code. Try "BUKKA20" or "HOTBUKKA"';
        _promoError = true;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Bukka Bag'),
        actions: [
          if (widget.cartViewModel.items.isNotEmpty)
            TextButton(
              onPressed: () => _showClearConfirmation(context),
              child: const Text('Clear', style: TextStyle(color: AppColors.error)),
            ),
        ],
      ),
      body: ListenableBuilder(
        listenable: widget.cartViewModel,
        builder: (context, _) {
          if (widget.cartViewModel.items.isEmpty) {
            return EmptyStateView(
              icon: Icons.shopping_bag_outlined,
              title: 'Your Bukka Bag is Empty',
              message: 'Discover spicy jollof, tender goat meat suya, and native soups to start feasting.',
              buttonText: 'Explore Menu',
              onButtonPressed: () => Navigator.of(context).pop(),
            );
          }

          final freeDeliveryDiff = AppConstants.freeDeliveryThreshold - widget.cartViewModel.subtotal;

          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(18),
                  children: [
                    // Free Delivery Progress Banner
                    if (freeDeliveryDiff > 0)
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: AppColors.secondary.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.secondary.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.delivery_dining, color: Color(0xFFD97706), size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Add ${CurrencyFormatter.format(freeDeliveryDiff)} more to unlock FREE Bukka delivery!',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF92400E),
                                ),
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: AppColors.accentGreen.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.accentGreen.withOpacity(0.3)),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.check_circle, color: AppColors.accentGreen, size: 20),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'You unlocked FREE Bukka Delivery! 🎉',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.accentGreen,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                    // Bag Items
                    for (final item in widget.cartViewModel.items) ...[
                      _buildCartItemTile(item, isDark),
                      const SizedBox(height: 12),
                    ],
                    const SizedBox(height: 16),

                    // Promo Code Box
                    _buildPromoSection(isDark),
                    const SizedBox(height: 20),

                    // Bill Summary Breakdown
                    _buildBillSummary(isDark),
                    const SizedBox(height: 40),
                  ],
                ),
              ),

              // Bottom Checkout Button Bar
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  border: Border(
                    top: BorderSide(
                      color: isDark ? AppColors.dividerDark : AppColors.dividerLight,
                      width: 1,
                    ),
                  ),
                ),
                child: SafeArea(
                  child: Row(
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('Total Amount', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          Text(
                            CurrencyFormatter.format(widget.cartViewModel.total),
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 20),
                      Expanded(
                        child: CustomButton(
                          text: 'Checkout (${widget.cartViewModel.itemCount})',
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => CheckoutScreen(
                                  cartViewModel: widget.cartViewModel,
                                  bukkaRepository: widget.bukkaRepository,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildCartItemTile(dynamic item, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? AppColors.dividerDark : AppColors.dividerLight,
          width: 0.8,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.network(
              item.foodItem.imageUrl,
              width: 70,
              height: 70,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                width: 70,
                height: 70,
                color: isDark ? AppColors.cardDark : AppColors.cardLight,
                child: const Icon(Icons.restaurant, color: AppColors.primary),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        item.foodItem.name,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 18, color: Colors.grey),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () => widget.cartViewModel.removeItem(item.id),
                    ),
                  ],
                ),
                if (item.selectedOptions.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    children: [
                      for (final opt in item.selectedOptions)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.cardDark : AppColors.cardLight,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            opt.name,
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
                          ),
                        ),
                    ],
                  ),
                ],
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      CurrencyFormatter.format(item.totalPrice),
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                    QuantitySelector(
                      quantity: item.quantity,
                      compact: true,
                      onChanged: (val) => widget.cartViewModel.updateQuantity(item.id, val),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPromoSection(bool isDark) {
    final applied = widget.cartViewModel.appliedPromoCode;

    if (applied != null) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.accentGreen.withOpacity(0.12),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.accentGreen.withOpacity(0.3)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.confirmation_number_outlined, color: AppColors.accentGreen, size: 20),
                const SizedBox(width: 8),
                Text(
                  'Code $applied Applied (-${CurrencyFormatter.format(widget.cartViewModel.promoDiscount)})',
                  style: const TextStyle(
                    color: AppColors.accentGreen,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
            IconButton(
              icon: const Icon(Icons.close, color: AppColors.accentGreen, size: 18),
              onPressed: () => widget.cartViewModel.removePromoCode(),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: SizedBox(
                height: 46,
                child: TextField(
                  controller: _promoController,
                  textCapitalization: TextCapitalization.characters,
                  decoration: const InputDecoration(
                    hintText: 'Promo Code (try BUKKA20)',
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            ElevatedButton(
              onPressed: _applyPromo,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.secondary,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Apply', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
        if (_promoMessage != null) ...[
          const SizedBox(height: 6),
          Text(
            _promoMessage!,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: _promoError ? AppColors.error : AppColors.accentGreen,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildBillSummary(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? AppColors.dividerDark : AppColors.dividerLight,
          width: 0.8,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Bill Details', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          _buildBillRow('Item Subtotal', CurrencyFormatter.format(widget.cartViewModel.subtotal)),
          _buildBillRow(
            'Delivery Partner Fee',
            widget.cartViewModel.deliveryFee == 0.0
                ? 'FREE'
                : CurrencyFormatter.format(widget.cartViewModel.deliveryFee),
            isHighlighted: widget.cartViewModel.deliveryFee == 0.0,
          ),
          _buildBillRow('Eco Packaging Fee', CurrencyFormatter.format(widget.cartViewModel.packagingFee)),
          _buildBillRow('Restaurant Service Fee', CurrencyFormatter.format(widget.cartViewModel.serviceFee)),
          if (widget.cartViewModel.promoDiscount > 0)
            _buildBillRow(
              'Bukka Promo Discount',
              '-${CurrencyFormatter.format(widget.cartViewModel.promoDiscount)}',
              isGreen: true,
            ),
          const Divider(height: 20),
          _buildBillRow(
            'Grand Total',
            CurrencyFormatter.format(widget.cartViewModel.total),
            isBold: true,
          ),
        ],
      ),
    );
  }

  Widget _buildBillRow(String title, String amount, {bool isBold = false, bool isGreen = false, bool isHighlighted = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: isBold ? 15 : 13,
              fontWeight: isBold ? FontWeight.w800 : FontWeight.w400,
              color: isBold ? null : Colors.grey.shade600,
            ),
          ),
          Text(
            amount,
            style: TextStyle(
              fontSize: isBold ? 16 : 13,
              fontWeight: isBold ? FontWeight.w900 : FontWeight.w600,
              color: isGreen || isHighlighted ? AppColors.accentGreen : (isBold ? AppColors.primary : null),
            ),
          ),
        ],
      ),
    );
  }

  void _showClearConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Empty Bukka Bag?'),
        content: const Text('Are you sure you want to remove all items from your bag?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              widget.cartViewModel.clearCart();
              Navigator.of(ctx).pop();
            },
            child: const Text('Clear', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }
}
