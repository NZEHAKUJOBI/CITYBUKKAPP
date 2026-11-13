import 'package:flutter/material.dart';

/// Design tokens and color palette for CityBukka MX.
/// Inspired by rich Nigerian/African culinary spices, palm oil gold, and charcoal grills.
class AppColors {
  // Brand Primary: Fiery Clay / Bukka Sunset
  static const Color primary = Color(0xFFE64A19);
  static const Color primaryLight = Color(0xFFFF7D47);
  static const Color primaryDark = Color(0xFFBF360C);

  // Brand Secondary: Golden Plantain / Palm Oil Amber
  static const Color secondary = Color(0xFFFFB300);
  static const Color secondaryLight = Color(0xFFFFE082);
  static const Color secondaryDark = Color(0xFFFF8F00);

  // Fresh Accent: Scent Leaf Emerald
  static const Color accentGreen = Color(0xFF10B981);
  static const Color accentGreenLight = Color(0xFFD1FAE5);
  static const Color accentGreenDark = Color(0xFF047857);

  // Neutrals - Light Theme (Dark Forest Green Variant)
  static const Color backgroundLight = Color(0xFF081C13);
  static const Color surfaceLight = Color(0xFF0D281C);
  static const Color cardLight = Color(0xFF133624);
  static const Color dividerLight = Color(0xFF1E4B34);
  static const Color textPrimaryLight = Color(0xFFF3FAF5);
  static const Color textSecondaryLight = Color(0xFFA7D5BE);
  static const Color textMutedLight = Color(0xFF709E88);

  // Neutrals - Dark Theme (Deep Obsidian Dark Green)
  static const Color backgroundDark = Color(0xFF071910);
  static const Color surfaceDark = Color(0xFF0C2619);
  static const Color cardDark = Color(0xFF133624);
  static const Color dividerDark = Color(0xFF1E4B34);
  static const Color textPrimaryDark = Color(0xFFF3FAF5);
  static const Color textSecondaryDark = Color(0xFFA7D5BE);
  static const Color textMutedDark = Color(0xFF709E88);

  // Status & Feedback
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);
  static const Color ratingStar = Color(0xFFFBBF24);

  // Spice Indicator Colors
  static const Color spiceMild = Color(0xFF10B981);
  static const Color spiceMedium = Color(0xFFF59E0B);
  static const Color spiceHot = Color(0xFFEF4444);
  static const Color spiceBukkaFire = Color(0xFF881337);

  // Gradients
  static const LinearGradient greenGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF10B981), Color(0xFF059669), Color(0xFF047857)],
  );

  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFF5722), Color(0xFFE64A19), Color(0xFFBF360C)],
  );

  static const LinearGradient goldGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFFC107), Color(0xFFFFB300), Color(0xFFFFA000)],
  );

  static const LinearGradient darkCardGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF133624), Color(0xFF0C2619)],
  );
}
