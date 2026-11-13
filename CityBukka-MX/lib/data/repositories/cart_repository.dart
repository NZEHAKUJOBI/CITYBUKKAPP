import '../../domain/models/cart_item.dart';
import '../../core/constants/app_constants.dart';

class CartRepository {
  final List<CartItem> _items = [];
  String? _appliedPromoCode;
  double _promoDiscount = 0.0;

  List<CartItem> get items => List.unmodifiable(_items);
  int get itemCount => _items.fold(0, (sum, i) => sum + i.quantity);
  String? get appliedPromoCode => _appliedPromoCode;
  double get promoDiscount => _promoDiscount;

  double get subtotal => _items.fold(0.0, (sum, i) => sum + i.totalPrice);

  double get deliveryFee {
    if (_items.isEmpty) return 0.0;
    if (subtotal >= AppConstants.freeDeliveryThreshold) return 0.0;
    return AppConstants.standardDeliveryFee;
  }

  double get serviceFee => _items.isEmpty ? 0.0 : AppConstants.serviceFee;
  double get packagingFee => _items.isEmpty ? 0.0 : AppConstants.packagingFee;

  double get total {
    if (_items.isEmpty) return 0.0;
    final totalBeforeDiscount = subtotal + deliveryFee + serviceFee + packagingFee;
    return (totalBeforeDiscount - _promoDiscount).clamp(0.0, double.infinity);
  }

  void addItem(CartItem newItem) {
    // Check if item with exact same food and customizations already exists
    final index = _items.indexWhere((item) =>
        item.foodItem.id == newItem.foodItem.id &&
        _areOptionsEqual(item.selectedOptions, newItem.selectedOptions));

    if (index >= 0) {
      final existing = _items[index];
      _items[index] = existing.copyWith(quantity: existing.quantity + newItem.quantity);
    } else {
      _items.add(newItem);
    }
    _recalculateDiscount();
  }

  void updateQuantity(String cartItemId, int newQuantity) {
    final index = _items.indexWhere((i) => i.id == cartItemId);
    if (index >= 0) {
      if (newQuantity <= 0) {
        _items.removeAt(index);
      } else {
        _items[index] = _items[index].copyWith(quantity: newQuantity);
      }
      _recalculateDiscount();
    }
  }

  void removeItem(String cartItemId) {
    _items.removeWhere((i) => i.id == cartItemId);
    _recalculateDiscount();
  }

  void clearCart() {
    _items.clear();
    _appliedPromoCode = null;
    _promoDiscount = 0.0;
  }

  bool applyPromoCode(String code) {
    final upper = code.trim().toUpperCase();
    if (AppConstants.promoCodes.containsKey(upper)) {
      _appliedPromoCode = upper;
      _recalculateDiscount();
      return true;
    }
    return false;
  }

  void removePromoCode() {
    _appliedPromoCode = null;
    _promoDiscount = 0.0;
  }

  void _recalculateDiscount() {
    if (_appliedPromoCode == null || _items.isEmpty) {
      _promoDiscount = 0.0;
      return;
    }

    final discountVal = AppConstants.promoCodes[_appliedPromoCode]!;
    if (discountVal < 1.0) {
      // Percentage of subtotal
      _promoDiscount = subtotal * discountVal;
    } else {
      // Flat amount
      _promoDiscount = discountVal.clamp(0.0, subtotal);
    }
  }

  bool _areOptionsEqual(List<dynamic> a, List<dynamic> b) {
    if (a.length != b.length) return false;
    final aIds = a.map((e) => e.id).toSet();
    final bIds = b.map((e) => e.id).toSet();
    return aIds.containsAll(bIds);
  }
}
