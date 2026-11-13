import 'package:flutter/material.dart';
import 'package:citybukka_mx/core/theme/app_colors.dart';
import 'package:citybukka_mx/core/utils/currency_formatter.dart';
import 'package:citybukka_mx/domain/models/order.dart';
import 'package:citybukka_mx/ui/features/orders/view_models/orders_view_model.dart';
import 'package:citybukka_mx/ui/features/navigation/main_navigation_screen.dart';

class OrderTrackingScreen extends StatefulWidget {
  final Order order;
  final OrdersViewModel ordersViewModel;

  const OrderTrackingScreen({
    super.key,
    required this.order,
    required this.ordersViewModel,
  });

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  late Order _order;

  @override
  void initState() {
    super.initState();
    _order = widget.order;
    widget.ordersViewModel.selectTrackingOrder(_order);
  }

  void _simulateNextStage() {
    widget.ordersViewModel.advanceTrackingOrderStatus();
    if (widget.ordersViewModel.currentTrackingOrder != null) {
      setState(() {
        _order = widget.ordersViewModel.currentTrackingOrder!;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('Track Order #${_order.id}'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            Navigator.of(context).pushAndRemoveUntil(
              MaterialPageRoute(builder: (_) => const MainNavigationScreen(initialIndex: 2)),
              (route) => false,
            );
          },
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Live Status Hero Banner
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withOpacity(0.35),
                  blurRadius: 18,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        'ESTIMATED DELIVERY',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.9),
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                    const Icon(Icons.delivery_dining, color: Colors.white, size: 28),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  _order.status == OrderStatus.delivered
                      ? 'Meal Delivered 🎉'
                      : '${_order.estimatedDeliveryMinutes} Minutes',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _order.status.description,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.9),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Stepper Timeline
          const Text(
            'Live Bukka Progress',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 16),
          _buildTimeline(isDark),
          const SizedBox(height: 24),

          // Rider Profile Card
          if (_order.riderName != null) ...[
            _buildRiderCard(isDark),
            const SizedBox(height: 24),
          ],

          // Order Summary Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
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
                    const Text('Delivery Address', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    Text(
                      CurrencyFormatter.format(_order.total),
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 15,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  _order.deliveryAddress,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.payment, size: 14, color: Colors.grey.shade500),
                    const SizedBox(width: 4),
                    Text(
                      'Paid via ${_order.paymentMethod}',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Interactive Testing Simulation Button
          if (_order.status != OrderStatus.delivered)
            OutlinedButton.icon(
              onPressed: _simulateNextStage,
              icon: const Icon(Icons.fast_forward_rounded, color: AppColors.primary),
              label: const Text('Simulate Next Delivery Stage 🚀'),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.primary, width: 1.5),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildTimeline(bool isDark) {
    final steps = [
      {'status': OrderStatus.placed, 'title': 'Order Placed & Confirmed', 'sub': 'Bukka notified'},
      {'status': OrderStatus.preparing, 'title': 'Bukka Kitchen Sizzling', 'sub': 'Chefs are cooking over firewood'},
      {'status': OrderStatus.riderAssigned, 'title': 'Rider Assigned', 'sub': '${_order.riderName ?? "Driver"} dispatched'},
      {'status': OrderStatus.outForDelivery, 'title': 'Out for Delivery', 'sub': 'Cruising on motorbike to your address'},
      {'status': OrderStatus.delivered, 'title': 'Delivered', 'sub': 'Enjoy your authentic feast!'},
    ];

    final currentStep = _order.status.stepIndex;

    return Column(
      children: [
        for (int i = 0; i < steps.length; i++) ...[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon Circle & connecting line
              Column(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: i <= currentStep
                          ? AppColors.primary
                          : (isDark ? AppColors.cardDark : Colors.grey.shade200),
                      border: Border.all(
                        color: i <= currentStep ? AppColors.primary : Colors.grey.shade400,
                        width: 1.5,
                      ),
                    ),
                    child: Center(
                      child: i < currentStep
                          ? const Icon(Icons.check, size: 16, color: Colors.white)
                          : (i == currentStep
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : Text(
                                  '${i + 1}',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.grey.shade500,
                                  ),
                                )),
                    ),
                  ),
                  if (i < steps.length - 1)
                    Container(
                      width: 2,
                      height: 36,
                      color: i < currentStep ? AppColors.primary : Colors.grey.shade300,
                    ),
                ],
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        steps[i]['title'] as String,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: i <= currentStep ? FontWeight.w800 : FontWeight.w500,
                          color: i <= currentStep
                              ? (isDark ? Colors.white : Colors.black87)
                              : Colors.grey,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        steps[i]['sub'] as String,
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildRiderCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.dividerDark : AppColors.dividerLight,
          width: 0.8,
        ),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 26,
            backgroundColor: AppColors.secondary.withOpacity(0.2),
            child: const Icon(Icons.person, color: AppColors.primary, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      _order.riderName!,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: AppColors.secondary.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.star, size: 10, color: Color(0xFFD97706)),
                          const SizedBox(width: 2),
                          Text(
                            '${_order.riderRating ?? 4.9}',
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  _order.riderVehicle ?? 'Motorbike',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Calling ${_order.riderName}...'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            icon: const CircleAvatar(
              backgroundColor: AppColors.accentGreen,
              child: Icon(Icons.phone, color: Colors.white, size: 18),
            ),
          ),
        ],
      ),
    );
  }
}
