# Chop City Bukka 🍲🔥

> **Taste the Soul of the City — From Bukka Fire to Your Door in Minna, Niger State**

**Chop City Bukka** is a production-grade, state-of-the-art Flutter (Dart) mobile and web application celebrating authentic Nigerian and African culinary dining in Minna, Niger State. It brings local "Bukka" street-kitchens, woodfire stew masters, suya grillers, coastal seafood wharf artisans, and chilled elixirs into a seamless, modern ordering experience.

---

## 🌟 Key Features

1. **Bukka Discovery & Exploration**
   - Live location delivery header (`Minna, Niger State` - shiroro, Road, by Unity block).
   - Category filtering with animated chip selectors:
     - 🍚 *Rice & Grains* (Smoky Party Jellof Rice, Savory Special Fried Rice)
     - 🥟 *Moimoi & Savories* (Special Steamed Moimoi)
     - 🍹 *Zobo & Kunu Drinks* (Artisanal Chilled Zobo, Special Kunu Zaki, Creamy Kunu Aya)
   - Real-time search by dish, ingredient, or Bukka name.
   - Interactive filtering by prep time (<30 mins), ratings, spice intensity, and Halal status.

2. **Dish Customizer & Culinary Details**
   - Spice level indicators: *Mild 🌿*, *Medium 🌶️*, *Hot 🌶️🌶️*, and *Bukka Fire 🔥🌶️*.
   - Protein selection (Peppered Chicken, Bukka Goat Meat, Fried Turkey, Smoked Titus Fish).
   - Add-on extras (Golden fried dodo plantain, boiled egg, island coleslaw, liver & gizzard toss).
   - Drink customization (Ice-cold serving, chilled bottle, extra ginger boost, sweet dates dabino boost).
   - Dynamic real-time bag calculation with quantity controls.

3. **Smart Bukka Bag & Checkout**
   - Free Delivery progress tracker (Unlocks at ₦7,500).
   - Promotional voucher engine (supports `BUKKA20` for 20% off, `HOTBUKKA` for ₦500 off).
   - Detailed fee transparency: Item subtotal, delivery partner fee, eco-packaging fee, restaurant service fee, and applied discount.
   - Saved address selector (Home, Office, Hub).
   - Multiple payment methods:
     - **CityPay Wallet** (instant 1-tap debit)
     - **Debit / Credit Card** (Mastercard, Visa, Verve)
     - **Bank Transfer** (Instant virtual account)
     - **Cash on Delivery / POS on Arrival**

4. **Live Order Tracking Experience**
   - 5-step animated delivery timeline:
     1. *Order Placed & Confirmed*
     2. *Bukka Kitchen Sizzling (Firewood embers cooking)*
     3. *Rider Assigned & Dispatched*
     4. *Out for Delivery (Live bike progress ETA)*
     5. *Delivered & Savored*
   - Real-time driver profile (photo, rating, TVS/Bajaj motorbike plate number, direct call/chat action).
   - Interactive simulation mode to test each status transition live.

5. **Saved Cravings & Bukka MX Rewards**
   - Wishlist tabs for favorite dishes and bookmarked Bukka restaurants.
   - Bukka Fire loyalty wallet (750 Points = ₦750 discount).
   - Built-in Dark Mode / Light Mode theme switch.

---

## 🏛️ Architecture & Clean Code

The codebase strictly adheres to the official Flutter architectural guidelines:
- **Separation of Concerns**: Clean separation of Domain Models, Data Repositories, Services, and UI Presentation.
- **MVVM Pattern**: ViewModels extend `ChangeNotifier` to manage immutable state and expose clean command methods to Views.
- **Dependency Injection**: Repositories are cleanly injected into ViewModels.
- **Material 3 Design Tokens**: Tailored color palette, curated typography, rounded cards, and smooth micro-interactions.

```
lib/
├── main.dart
├── core/
│   ├── theme/
│   │   ├── app_colors.dart
│   │   ├── app_text_styles.dart
│   │   └── app_theme.dart
│   ├── constants/
│   │   └── app_constants.dart
│   └── utils/
│       └── currency_formatter.dart
├── domain/
│   └── models/
│       ├── food_item.dart
│       ├── restaurant.dart
│       ├── category.dart
│       ├── cart_item.dart
│       ├── order.dart
│       └── user_profile.dart
├── data/
│   ├── mock_data/
│   │   └── bukka_mock_data.dart
│   ├── services/
│   │   ├── bukka_api_service.dart
│   │   └── local_storage_service.dart
│   └── repositories/
│       ├── bukka_repository.dart
│       ├── cart_repository.dart
│       └── order_repository.dart
└── ui/
    ├── core/
    │   └── widgets/
    │       ├── rating_badge.dart
    │       ├── custom_button.dart
    │       ├── quantity_selector.dart
    │       ├── category_chip.dart
    │       ├── search_bar_widget.dart
    │       ├── food_item_card.dart
    │       ├── restaurant_card.dart
    │       ├── promo_banner_card.dart
    │       └── empty_state_view.dart
    └── features/
        ├── splash/
        ├── navigation/
        ├── home/
        ├── restaurant/
        ├── dish/
        ├── cart/
        ├── orders/
        ├── favorites/
        └── profile/
```

---

## 📱 Mobile App Platforms & Architecture

The application is fully configured as a native mobile experience for **Android** and **iOS**, as well as an interactive mobile simulator for web/desktop previews:

- **Native Mobile Support**: Native Android (`android/` with Kotlin, Gradle, `android.permission.INTERNET`, and application labeling) and iOS (`ios/` with Swift & Runner setup).
- **Responsive Mobile Shell (`MobileAppShell`)**:
  - When run on physical mobile devices (Android/iOS) or narrow viewports (`<= 500px`), the app renders **100% full-bleed edge-to-edge native mobile UI**.
  - When previewed in desktop browsers (`flutter run -d chrome`) or Windows desktop, the app automatically embeds into a centered, photorealistic smartphone frame featuring an authentic top notch/dynamic island, clock, cellular/battery status bar, and bottom home indicator bar (with a 1-click toggle to expand full-screen).
- **Adaptive Layout**: All cards, header rows, chips, and horizontal sliders are responsive and overflow-free across compact and large screen widths.

---

## 🚀 Running the App

### Requirements
- Flutter SDK (3.10+)
- Dart SDK (3.0+)
- Android Studio / Android SDK (for physical Android devices & emulators)
- Xcode (macOS only, for iOS)

### Commands

#### 1. Native Mobile (Android)
```bash
# Check connected Android devices or emulators
flutter devices

# Run directly on your connected Android phone or emulator
flutter run -d android

# Build a release APK ready for installation on any Android phone
flutter build apk --release
# Built APK will be located at: build/app/outputs/flutter-apk/app-release.apk

# Build Google Play App Bundle
flutter build appbundle
```

#### 2. Mobile Simulator on Chrome / Web
```bash
# Launch with authentic mobile frame and status bar preview
flutter run -d chrome
```

#### 3. Windows Desktop
```bash
flutter run -d windows
```

#### 4. Automated Testing
```bash
flutter test
```
