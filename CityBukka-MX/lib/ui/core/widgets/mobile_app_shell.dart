import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// A wrapper widget that ensures CityBukka MX provides an authentic mobile app
/// experience across all platforms.
///
/// - On physical mobile devices (Android / iOS) or narrow screens (<= 500px),
///   it renders edge-to-edge full-bleed native mobile UI.
/// - On wide screens (Web desktop, Windows Desktop, macOS), it centers the app
///   in a sleek, realistic smartphone shell with device notch, status bar, and
///   soft ambient shadow, with an option to toggle full-screen view.
class MobileAppShell extends StatefulWidget {
  final Widget child;

  const MobileAppShell({
    super.key,
    required this.child,
  });

  @override
  State<MobileAppShell> createState() => _MobileAppShellState();
}

class _MobileAppShellState extends State<MobileAppShell> {
  bool _forceMobileFrame = true;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Native mobile screen width or user explicitly wants full-bleed
        final isNarrow = constraints.maxWidth <= 500;
        if (isNarrow || !_forceMobileFrame) {
          return widget.child;
        }

        final isDark = Theme.of(context).brightness == Brightness.dark;
        const double phoneWidth = 412; // Standard modern Android/iOS viewport width
        final double phoneHeight = (constraints.maxHeight * 0.94).clamp(700.0, 920.0);

        return Scaffold(
          backgroundColor: isDark ? const Color(0xFF09100C) : const Color(0xFFECEFEA),
          body: Stack(
            children: [
              // Background ambient branding
              const Positioned.fill(
                child: Opacity(
                  opacity: 0.05,
                  child: GridPaper(
                    color: AppColors.primary,
                    divisions: 2,
                    subdivisions: 1,
                  ),
                ),
              ),

              // Centered Mobile Device Frame
              Center(
                child: Container(
                  width: phoneWidth,
                  height: phoneHeight,
                  margin: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
                    borderRadius: BorderRadius.circular(44),
                    border: Border.all(
                      color: isDark ? const Color(0xFF28362D) : const Color(0xFFD4DDD7),
                      width: 10,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: isDark ? 0.6 : 0.15),
                        blurRadius: 40,
                        spreadRadius: 4,
                        offset: const Offset(0, 16),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(34),
                    child: Column(
                      children: [
                        // Mobile Device Top Status Bar
                        _buildMobileStatusBar(isDark),

                        // Actual Flutter Mobile App View
                        Expanded(
                          child: MediaQuery(
                            data: MediaQuery.of(context).copyWith(
                              size: Size(phoneWidth, phoneHeight - 64),
                              padding: const EdgeInsets.only(top: 0, bottom: 10),
                            ),
                            child: widget.child,
                          ),
                        ),

                        // Bottom Home Indicator Bar
                        _buildHomeIndicator(isDark),
                      ],
                    ),
                  ),
                ),
              ),

              // Desktop Header Bar with Controls
              Positioned(
                top: 14,
                right: 20,
                child: SafeArea(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isDark ? AppColors.dividerDark : AppColors.dividerLight,
                        width: 0.8,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.08),
                          blurRadius: 10,
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.smartphone_rounded, size: 16, color: AppColors.accentGreen),
                        const SizedBox(width: 6),
                        const Text(
                          'Mobile Preview Mode',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(width: 8),
                        InkWell(
                          onTap: () => setState(() => _forceMobileFrame = !_forceMobileFrame),
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            child: Icon(
                              _forceMobileFrame ? Icons.fullscreen : Icons.fullscreen_exit,
                              size: 18,
                              color: AppColors.accentGreen,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMobileStatusBar(bool isDark) {
    final now = DateTime.now();
    final timeStr = '${now.hour % 12 == 0 ? 12 : now.hour % 12}:${now.minute.toString().padLeft(2, '0')}';
    final textColor = isDark ? Colors.white70 : Colors.black87;

    return Container(
      height: 38,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      color: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            timeStr,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: textColor,
            ),
          ),
          // Dynamic Island / Camera Notch
          Container(
            width: 84,
            height: 18,
            decoration: BoxDecoration(
              color: isDark ? Colors.black : const Color(0xFF1F2922),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  margin: const EdgeInsets.only(right: 6),
                  decoration: const BoxDecoration(
                    color: Color(0xFF10281A),
                    shape: BoxShape.circle,
                  ),
                ),
              ],
            ),
          ),
          Row(
            children: [
              Icon(Icons.signal_cellular_4_bar_rounded, size: 14, color: textColor),
              const SizedBox(width: 4),
              Icon(Icons.wifi_rounded, size: 14, color: textColor),
              const SizedBox(width: 4),
              Icon(Icons.battery_full_rounded, size: 15, color: textColor),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHomeIndicator(bool isDark) {
    return Container(
      height: 16,
      width: double.infinity,
      color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      alignment: Alignment.center,
      child: Container(
        width: 120,
        height: 4,
        decoration: BoxDecoration(
          color: isDark ? Colors.white24 : Colors.black26,
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    );
  }
}
