import 'package:flutter/material.dart';
import 'package:citybukka_mx/core/theme/app_colors.dart';
import 'package:citybukka_mx/core/utils/currency_formatter.dart';
import 'package:citybukka_mx/data/repositories/bukka_repository.dart';
import 'package:citybukka_mx/data/repositories/order_repository.dart';
import 'package:citybukka_mx/ui/core/widgets/custom_button.dart';
import 'package:citybukka_mx/ui/features/cart/view_models/cart_view_model.dart';
import 'package:citybukka_mx/ui/features/orders/view_models/orders_view_model.dart';
import 'package:citybukka_mx/ui/features/orders/views/order_tracking_screen.dart';

class CheckoutScreen extends StatefulWidget {
  final CartViewModel cartViewModel;
  final BukkaRepository bukkaRepository;
  final OrdersViewModel? ordersViewModel;

  const CheckoutScreen({
    super.key,
    required this.cartViewModel,
    required this.bukkaRepository,
    this.ordersViewModel,
  });

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  int _selectedAddressIndex = 0;
  String _selectedPaymentMethod = 'CityPay Wallet';
  bool _isPlacing = false;

  final List<Map<String, String>> _addresses = [
    {
      'label': 'Home (Shiroro Road, Minna)',
      'address': 'Shiroro Road by Unity Block, Minna',
      'icon': 'home',
    },
    {
      'label': 'GRA Office (Minna)',
      'address': '12 Government Road, GRA, Minna, Niger State',
      'icon': 'work',
    },
    {
      'label': 'Campus Hub (Bosso)',
      'address': 'FUT Minna Bosso Campus Gate, Minna, Niger State',
      'icon': 'location_city',
    },
  ];

  final List<Map<String, dynamic>> _paymentMethods = [
    {
      'name': 'CityPay Wallet',
      'subtitle': 'Balance: ₦15,400.00 (Instant 1-Tap)',
      'icon': Icons.account_balance_wallet_rounded,
      'isFast': true,
    },
    {
      'name': 'Debit / Credit Card',
      'subtitle': 'Mastercard, Visa, Verve',
      'icon': Icons.credit_card_rounded,
      'isFast': false,
    },
    {
      'name': 'Bank Transfer',
      'subtitle': 'Instant Account Number Generation',
      'icon': Icons.account_balance_rounded,
      'isFast': false,
    },
    {
      'name': 'Cash on Delivery',
      'subtitle': 'Pay cash or POS upon food arrival',
      'icon': Icons.money_rounded,
      'isFast': false,
    },
  ];

  Future<void> _handlePlaceOrder() async {
    setState(() => _isPlacing = true);

    await Future.delayed(const Duration(milliseconds: 1000));

    final ordersVm = widget.ordersViewModel ?? OrdersViewModel();

    final order = await ordersVm.placeOrder(
      items: widget.cartViewModel.items,
      subtotal: widget.cartViewModel.subtotal,
      deliveryFee: widget.cartViewModel.deliveryFee,
      serviceFee: widget.cartViewModel.serviceFee,
      packagingFee: widget.cartViewModel.packagingFee,
      discount: widget.cartViewModel.promoDiscount,
      total: widget.cartViewModel.total,
      deliveryAddress: _addresses[_selectedAddressIndex]['address']!,
      paymentMethod: _selectedPaymentMethod,
    );

    widget.cartViewModel.clearCart();

    if (mounted) {
      setState(() => _isPlacing = false);
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => OrderTrackingScreen(
            order: order,
            ordersViewModel: ordersVm,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          // Delivery Address Selector
          const Text('Delivery Address', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          for (int i = 0; i < _addresses.length; i++) ...[
            _buildAddressCard(i, isDark),
            const SizedBox(height: 10),
          ],
          const SizedBox(height: 18),

          // Delivery ETA Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isDark ? AppColors.cardDark : AppColors.cardLight,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Row(
              children: [
                Icon(Icons.bolt, color: AppColors.secondary, size: 24),
                SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Instant Bukka Dispatch',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                      Text(
                        'Estimated Delivery in 25 - 35 minutes',
                        style: TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),

          // Payment Methods
          const Text('Payment Method', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          for (final method in _paymentMethods) ...[
            _buildPaymentTile(method, isDark),
            const SizedBox(height: 10),
          ],
          const SizedBox(height: 22),

          // Order Summary Preview
          Container(
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
                const Text('Order Total', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${widget.cartViewModel.itemCount} items',
                      style: const TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                    Text(
                      CurrencyFormatter.format(widget.cartViewModel.total),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 30),

          // Place Order Button
          CustomButton(
            text: _isPlacing ? 'Confirming Order...' : 'Confirm & Pay ${CurrencyFormatter.format(widget.cartViewModel.total)}',
            isLoading: _isPlacing,
            onPressed: _handlePlaceOrder,
            height: 54,
          ),
        ],
      ),
    );
  }

  Widget _buildAddressCard(int index, bool isDark) {
    final item = _addresses[index];
    final isSelected = _selectedAddressIndex == index;

    return InkWell(
      onTap: () => setState(() => _selectedAddressIndex = index),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.primary : (isDark ? AppColors.dividerDark : AppColors.dividerLight),
            width: isSelected ? 1.6 : 0.8,
          ),
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
              color: isSelected ? AppColors.primary : Colors.grey,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item['label']!, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  const SizedBox(height: 3),
                  Text(item['address']!, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentTile(Map<String, dynamic> method, bool isDark) {
    final isSelected = _selectedPaymentMethod == method['name'];

    return InkWell(
      onTap: () => setState(() => _selectedPaymentMethod = method['name']),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.primary : (isDark ? AppColors.dividerDark : AppColors.dividerLight),
            width: isSelected ? 1.6 : 0.8,
          ),
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
              color: isSelected ? AppColors.primary : Colors.grey,
              size: 20,
            ),
            const SizedBox(width: 12),
            Icon(method['icon'] as IconData, color: AppColors.primary, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(method['name'] as String, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  Text(method['subtitle'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
