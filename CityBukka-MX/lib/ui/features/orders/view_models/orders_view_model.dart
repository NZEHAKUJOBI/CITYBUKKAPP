import 'package:flutter/material.dart';
import '../../../../data/repositories/order_repository.dart';
import '../../../../domain/models/cart_item.dart';
import '../../../../domain/models/order.dart';

class OrdersViewModel extends ChangeNotifier {
  final OrderRepository _repository;

  OrdersViewModel({OrderRepository? repository})
      : _repository = repository ?? OrderRepository();

  bool _isPlacingOrder = false;
  Order? _currentTrackingOrder;

  bool get isPlacingOrder => _isPlacingOrder;
  List<Order> get allOrders => _repository.orders;
  List<Order> get activeOrders => _repository.activeOrders;
  List<Order> get pastOrders => _repository.pastOrders;
  Order? get currentTrackingOrder => _currentTrackingOrder;

  void selectTrackingOrder(Order order) {
    _currentTrackingOrder = order;
    notifyListeners();
  }

  Future<Order> placeOrder({
    required List<CartItem> items,
    required double subtotal,
    required double deliveryFee,
    required double serviceFee,
    required double packagingFee,
    required double discount,
    required double total,
    required String deliveryAddress,
    required String paymentMethod,
  }) async {
    _isPlacingOrder = true;
    notifyListeners();

    try {
      final order = await _repository.createOrder(
        items: items,
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        serviceFee: serviceFee,
        packagingFee: packagingFee,
        discount: discount,
        total: total,
        deliveryAddress: deliveryAddress,
        paymentMethod: paymentMethod,
      );
      _currentTrackingOrder = order;
      return order;
    } finally {
      _isPlacingOrder = false;
      notifyListeners();
    }
  }

  void advanceTrackingOrderStatus() {
    if (_currentTrackingOrder == null) return;
    _repository.advanceOrderStatus(_currentTrackingOrder!.id);
    _currentTrackingOrder = _repository.getOrderById(_currentTrackingOrder!.id);
    notifyListeners();
  }
}
