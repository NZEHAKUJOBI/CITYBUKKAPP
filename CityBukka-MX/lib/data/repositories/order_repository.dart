import '../../domain/models/order.dart';
import '../../domain/models/cart_item.dart';
import '../services/bukka_api_service.dart';

class OrderRepository {
  final BukkaApiService _apiService;
  final List<Order> _orders = [];

  OrderRepository({BukkaApiService? apiService})
      : _apiService = apiService ?? BukkaApiService() {
    _initSampleOrders();
  }

  List<Order> get orders => List.unmodifiable(_orders);

  List<Order> get activeOrders =>
      _orders.where((o) => o.status != OrderStatus.delivered && o.status != OrderStatus.cancelled).toList();

  List<Order> get pastOrders =>
      _orders.where((o) => o.status == OrderStatus.delivered || o.status == OrderStatus.cancelled).toList();

  Order? getOrderById(String orderId) {
    try {
      return _orders.firstWhere((o) => o.id == orderId);
    } catch (_) {
      return null;
    }
  }

  Future<Order> createOrder({
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
    final order = Order(
      id: 'CB-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      items: List.from(items),
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      serviceFee: serviceFee,
      packagingFee: packagingFee,
      discount: discount,
      total: total,
      status: OrderStatus.placed,
      createdAt: DateTime.now(),
      deliveryAddress: deliveryAddress,
      paymentMethod: paymentMethod,
      riderName: 'Femi Balogun',
      riderPhone: '+234 813 992 0011',
      riderVehicle: 'Bajaj Boxer Motorbike (LAG-542-KJ)',
      riderRating: 4.95,
      estimatedDeliveryMinutes: 30,
    );

    final saved = await _apiService.createOrder(order);
    _orders.insert(0, saved);
    return saved;
  }

  void advanceOrderStatus(String orderId) {
    final index = _orders.indexWhere((o) => o.id == orderId);
    if (index >= 0) {
      final current = _orders[index];
      OrderStatus nextStatus = current.status;
      switch (current.status) {
        case OrderStatus.placed:
          nextStatus = OrderStatus.preparing;
          break;
        case OrderStatus.preparing:
          nextStatus = OrderStatus.riderAssigned;
          break;
        case OrderStatus.riderAssigned:
          nextStatus = OrderStatus.outForDelivery;
          break;
        case OrderStatus.outForDelivery:
          nextStatus = OrderStatus.delivered;
          break;
        case OrderStatus.delivered:
        case OrderStatus.cancelled:
          return;
      }
      _orders[index] = current.copyWith(status: nextStatus);
    }
  }

  void _initSampleOrders() {
    _orders.add(
      Order(
        id: 'CB-94821',
        items: [],
        subtotal: 7400.0,
        deliveryFee: 650.0,
        serviceFee: 200.0,
        packagingFee: 150.0,
        discount: 0.0,
        total: 8400.0,
        status: OrderStatus.outForDelivery,
        createdAt: DateTime.now().subtract(const Duration(minutes: 18)),
        deliveryAddress: 'Shiroro Road by Unity Block, Minna',
        paymentMethod: 'CityPay Wallet',
        riderName: 'Chidi Okonkwo',
        riderPhone: '+234 803 112 3344',
        riderVehicle: 'TVS Neo Motorbike (MNA-904-AA)',
        riderRating: 4.88,
        estimatedDeliveryMinutes: 12,
      ),
    );
  }
}
