import 'package:flutter/material.dart';
import '../../../../data/repositories/cart_repository.dart';
import '../../../../domain/models/cart_item.dart';

class CartViewModel extends ChangeNotifier {
  final CartRepository _repository;

  CartViewModel({CartRepository? repository})
      : _repository = repository ?? CartRepository();

  CartRepository get repository => _repository;

  List<CartItem> get items => _repository.items;
  int get itemCount => _repository.itemCount;
  double get subtotal => _repository.subtotal;
  double get deliveryFee => _repository.deliveryFee;
  double get serviceFee => _repository.serviceFee;
  double get packagingFee => _repository.packagingFee;
  double get promoDiscount => _repository.promoDiscount;
  double get total => _repository.total;
  String? get appliedPromoCode => _repository.appliedPromoCode;

  void addItem(CartItem item) {
    _repository.addItem(item);
    notifyListeners();
  }

  void updateQuantity(String cartItemId, int quantity) {
    _repository.updateQuantity(cartItemId, quantity);
    notifyListeners();
  }

  void removeItem(String cartItemId) {
    _repository.removeItem(cartItemId);
    notifyListeners();
  }

  void clearCart() {
    _repository.clearCart();
    notifyListeners();
  }

  bool applyPromoCode(String code) {
    final success = _repository.applyPromoCode(code);
    notifyListeners();
    return success;
  }

  void removePromoCode() {
    _repository.removePromoCode();
    notifyListeners();
  }
}
