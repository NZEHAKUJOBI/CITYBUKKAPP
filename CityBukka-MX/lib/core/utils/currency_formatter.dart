import '../constants/app_constants.dart';

class CurrencyFormatter {
  static String format(double amount, {String symbol = AppConstants.currencySymbol}) {
    final integerPart = amount.floor();
    final decimalPart = ((amount - integerPart) * 100).round();

    final digits = integerPart.toString();
    final buffer = StringBuffer();

    for (int i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) {
        buffer.write(',');
      }
      buffer.write(digits[i]);
    }

    if (decimalPart > 0) {
      final decStr = decimalPart.toString().padLeft(2, '0');
      return '$symbol${buffer.toString()}.$decStr';
    }
    return '$symbol${buffer.toString()}';
  }
}
