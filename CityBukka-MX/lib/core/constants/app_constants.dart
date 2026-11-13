class AppConstants {
  static const String appName = 'CityBukka MX';
  static const String appTagline = 'Authentic Bukka Flavors, Delivered Hot';
  static const String currencySymbol = '₦';

  // Assets
  static const String logo = 'assets/images/logo.png';
  static const String logoTransparent = 'assets/images/logo_transparent.png';
  static const String headerBanner = 'assets/images/header_banner.jpg';

  // Grab & Go Hotlines
  static const String grabAndGoPhone1 = '08084867532';
  static const String grabAndGoPhone2 = '07033846252';

  // Fee Structure
  static const double standardDeliveryFee = 650.0;
  static const double serviceFee = 200.0;
  static const double packagingFee = 150.0;
  static const double freeDeliveryThreshold = 7500.0;

  // Promo Codes
  static const Map<String, double> promoCodes = {
    'BUKKA20': 0.20,       // 20% off subtotal
    'FIRSTFEAST': 0.25,     // 25% off subtotal
    'HOTBUKKA': 500.0,      // ₦500 flat off
  };

  // Support Contacts
  static const String supportPhone = '+234 800 BUKKA MX';
  static const String supportEmail = 'help@citybukka.com';
}
