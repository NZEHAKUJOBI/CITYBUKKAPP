import 'package:flutter/material.dart';
import 'package:citybukka_mx/core/theme/app_colors.dart';
import 'package:citybukka_mx/core/utils/currency_formatter.dart';
import 'package:citybukka_mx/domain/models/order.dart';
import 'package:citybukka_mx/ui/core/widgets/empty_state_view.dart';
import 'package:citybukka_mx/ui/features/orders/view_models/orders_view_model.dart';
import 'order_tracking_screen.dart';

class OrdersScreen extends StatelessWidget {
  final OrdersViewModel ordersViewModel;

  const OrdersScreen({
    super.key,
    required this.ordersViewModel,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('My Orders'),
          bottom: TabBar(
            indicatorColor: AppColors.primary,
            indicatorWeight: 3,
            labelColor: AppColors.primary,
            unselectedLabelColor: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
            tabs: const [
              Tab(text: 'Active Feasts'),
              Tab(text: 'Order History'),
            ],
          ),
        ),
        body: ListenableBuilder(
          listenable: ordersViewModel,
          builder: (context, _) {
            final active = ordersViewModel.activeOrders;
            final past = ordersViewModel.pastOrders;

            return TabBarView(
              children: [
                // Active Orders Tab
                active.isEmpty
                    ? const EmptyStateView(
                        icon: Icons.receipt_long_outlined,
                        title: 'No Active Orders',
                        message: 'Hungry? Place an order and follow your food in real-time from the Bukka stove to your door.',
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(18),
                        itemCount: active.length,
                        itemBuilder: (context, index) => _buildOrderCard(context, active[index], true, isDark),
                      ),

                // Past Orders Tab
                past.isEmpty
                    ? const EmptyStateView(
                        icon: Icons.history_rounded,
                        title: 'No Past Orders Yet',
                        message: 'Your completed feasts and receipts will appear right here.',
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(18),
                        itemCount: past.length,
                        itemBuilder: (context, index) => _buildOrderCard(context, past[index], false, isDark),
                      ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildOrderCard(BuildContext context, Order order, bool isActive, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.dividerDark : AppColors.dividerLight,
          width: 0.8,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Order #${order.id}',
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isActive
                      ? AppColors.primary.withOpacity(0.12)
                      : AppColors.accentGreen.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  order.status.title,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: isActive ? AppColors.primary : AppColors.accentGreen,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            order.deliveryAddress,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Total Paid',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                  ),
                  Text(
                    CurrencyFormatter.format(order.total),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
              if (isActive)
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => OrderTrackingScreen(
                          order: order,
                          ordersViewModel: ordersViewModel,
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.navigation_outlined, size: 16),
                  label: const Text('Track Live'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  ),
                )
              else
                OutlinedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Re-order feature: Items added to your Bukka bag!'),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  ),
                  child: const Text('Re-order'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
