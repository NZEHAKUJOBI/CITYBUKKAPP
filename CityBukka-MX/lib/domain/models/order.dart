import 'cart_item.dart';

enum OrderStatus {
  placed,
  preparing,
  riderAssigned,
  outForDelivery,
  delivered,
  cancelled,
}

extension OrderStatusExtension on OrderStatus {
  String get title {
    switch (this) {
      case OrderStatus.placed:
        return 'Order Confirmed';
      case OrderStatus.preparing:
        return 'Bukka Kitchen Sizzling';
      case OrderStatus.riderAssigned:
        return 'Rider Assigned';
      case OrderStatus.outForDelivery:
        return 'Out for Delivery';
      case OrderStatus.delivered:
        return 'Delivered & Savored';
      case OrderStatus.cancelled:
        return 'Cancelled';
    }
  }

  String get description {
    switch (this) {
      case OrderStatus.placed:
        return 'Your order has been sent to the Bukka kitchen.';
      case OrderStatus.preparing:
        return 'Fresh spices and sizzle underway!';
      case OrderStatus.riderAssigned:
        return 'Your delivery partner is picking up your feast.';
      case OrderStatus.outForDelivery:
        return 'Rider is on the way to your door.';
      case OrderStatus.delivered:
        return 'Order arrived. Enjoy your meal!';
      case OrderStatus.cancelled:
        return 'This order was cancelled.';
    }
  }

  int get stepIndex {
    switch (this) {
      case OrderStatus.placed:
        return 0;
      case OrderStatus.preparing:
        return 1;
      case OrderStatus.riderAssigned:
        return 2;
      case OrderStatus.outForDelivery:
        return 3;
      case OrderStatus.delivered:
        return 4;
      case OrderStatus.cancelled:
        return -1;
    }
  }
}

class Order {
  final String id;
  final List<CartItem> items;
  final double subtotal;
  final double deliveryFee;
  final double serviceFee;
  final double packagingFee;
  final double discount;
  final double total;
  final OrderStatus status;
  final DateTime createdAt;
  final String deliveryAddress;
  final String paymentMethod;
  final String? riderName;
  final String? riderPhone;
  final String? riderVehicle;
  final double? riderRating;
  final int estimatedDeliveryMinutes;

  const Order({
    required this.id,
    required this.items,
    required this.subtotal,
    required this.deliveryFee,
    required this.serviceFee,
    required this.packagingFee,
    required this.discount,
    required this.total,
    this.status = OrderStatus.placed,
    required this.createdAt,
    required this.deliveryAddress,
    required this.paymentMethod,
    this.riderName,
    this.riderPhone,
    this.riderVehicle,
    this.riderRating,
    this.estimatedDeliveryMinutes = 35,
  });

  Order copyWith({
    String? id,
    List<CartItem>? items,
    double? subtotal,
    double? deliveryFee,
    double? serviceFee,
    double? packagingFee,
    double? discount,
    double? total,
    OrderStatus? status,
    DateTime? createdAt,
    String? deliveryAddress,
    String? paymentMethod,
    String? riderName,
    String? riderPhone,
    String? riderVehicle,
    double? riderRating,
    int? estimatedDeliveryMinutes,
  }) {
    return Order(
      id: id ?? this.id,
      items: items ?? this.items,
      subtotal: subtotal ?? this.subtotal,
      deliveryFee: deliveryFee ?? this.deliveryFee,
      serviceFee: serviceFee ?? this.serviceFee,
      packagingFee: packagingFee ?? this.packagingFee,
      discount: discount ?? this.discount,
      total: total ?? this.total,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      deliveryAddress: deliveryAddress ?? this.deliveryAddress,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      riderName: riderName ?? this.riderName,
      riderPhone: riderPhone ?? this.riderPhone,
      riderVehicle: riderVehicle ?? this.riderVehicle,
      riderRating: riderRating ?? this.riderRating,
      estimatedDeliveryMinutes: estimatedDeliveryMinutes ?? this.estimatedDeliveryMinutes,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'items': items.map((i) => i.toJson()).toList(),
    'subtotal': subtotal,
    'deliveryFee': deliveryFee,
    'serviceFee': serviceFee,
    'packagingFee': packagingFee,
    'discount': discount,
    'total': total,
    'status': status.index,
    'createdAt': createdAt.toIso8601String(),
    'deliveryAddress': deliveryAddress,
    'paymentMethod': paymentMethod,
    'riderName': riderName,
    'riderPhone': riderPhone,
    'riderVehicle': riderVehicle,
    'riderRating': riderRating,
    'estimatedDeliveryMinutes': estimatedDeliveryMinutes,
  };

  factory Order.fromJson(Map<String, dynamic> json) => Order(
    id: json['id'] as String,
    items: (json['items'] as List<dynamic>)
        .map((i) => CartItem.fromJson(i as Map<String, dynamic>))
        .toList(),
    subtotal: (json['subtotal'] as num).toDouble(),
    deliveryFee: (json['deliveryFee'] as num).toDouble(),
    serviceFee: (json['serviceFee'] as num).toDouble(),
    packagingFee: (json['packagingFee'] as num).toDouble(),
    discount: (json['discount'] as num).toDouble(),
    total: (json['total'] as num).toDouble(),
    status: OrderStatus.values[json['status'] as int? ?? 0],
    createdAt: DateTime.parse(json['createdAt'] as String),
    deliveryAddress: json['deliveryAddress'] as String,
    paymentMethod: json['paymentMethod'] as String,
    riderName: json['riderName'] as String?,
    riderPhone: json['riderPhone'] as String?,
    riderVehicle: json['riderVehicle'] as String?,
    riderRating: (json['riderRating'] as num?)?.toDouble(),
    estimatedDeliveryMinutes: json['estimatedDeliveryMinutes'] as int? ?? 35,
  );
}
