import 'package:flutter/material.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import 'search_bar_widget.dart';

/// A branded header widget featuring the ChopCity Bukka banner as a faded,
/// multi-stop gradient background with location info, quick Grab & Go action,
/// and an integrated search bar.
class FadedAppHeader extends StatelessWidget {
  final TextEditingController searchController;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onFilterTap;
  final VoidCallback onNotificationTap;
  final VoidCallback onGrabAndGoTap;
  final String addressTitle;
  final String addressSubtitle;
  final String bannerAsset;
  final bool transparentBackground;

  const FadedAppHeader({
    super.key,
    required this.searchController,
    required this.onSearchChanged,
    required this.onFilterTap,
    required this.onNotificationTap,
    required this.onGrabAndGoTap,
    this.addressTitle = 'Delivering to Minna',
    this.addressSubtitle = 'Shiroro Road by Unity Block, Minna',
    this.bannerAsset = AppConstants.headerBanner,
    this.transparentBackground = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final topPadding = MediaQuery.of(context).padding.top;
    final bgColor = theme.scaffoldBackgroundColor;

    final headerContent = Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        topPadding > 0 ? topPadding + 6 : 14,
        20,
        14,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Top Row: Location & Action Buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Delivery Location
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: AppColors.primary.withValues(alpha: 0.4),
                          width: 1,
                        ),
                      ),
                      child: const Icon(
                        Icons.location_on_rounded,
                        color: AppColors.primary,
                        size: 18,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Flexible(
                                child: Text(
                                  addressTitle,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14.5,
                                    letterSpacing: -0.2,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4),
                              const Icon(Icons.keyboard_arrow_down_rounded, size: 18),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            addressSubtitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 8),

              // Actions: Grab & Go Hotline + Notifications
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Grab & Go Hotline Pill
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: onGrabAndGoTap,
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.secondary.withValues(alpha: isDark ? 0.22 : 0.15),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: AppColors.secondary.withValues(alpha: 0.65),
                            width: 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.secondary.withValues(alpha: 0.12),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.phone_in_talk_rounded, size: 13, color: AppColors.secondary),
                            SizedBox(width: 5),
                            Text(
                              'Grab & Go',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: AppColors.secondary,
                                letterSpacing: 0.2,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),

                  // Notification Icon with unread badge
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.notifications_none_rounded),
                        onPressed: onNotificationTap,
                      ),
                      Positioned(
                        top: 10,
                        right: 10,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Search Bar Widget
          SearchBarWidget(
            controller: searchController,
            onChanged: onSearchChanged,
            onFilterTap: onFilterTap,
          ),
        ],
      ),
    );

    if (transparentBackground) {
      return SizedBox(
        width: double.infinity,
        child: headerContent,
      );
    }

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: bgColor,
      ),
      child: Stack(
        children: [
          // 1. Faded Background Banner Image
          Positioned.fill(
            child: Opacity(
              opacity: isDark ? 0.40 : 0.28,
              child: Image.asset(
                bannerAsset,
                fit: BoxFit.cover,
                alignment: Alignment.center,
                errorBuilder: (context, error, stackTrace) => const SizedBox.shrink(),
              ),
            ),
          ),

          // 2. Multi-stop Gradient Fade Overlay
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    bgColor.withValues(alpha: isDark ? 0.58 : 0.68),
                    bgColor.withValues(alpha: isDark ? 0.25 : 0.38),
                    bgColor.withValues(alpha: 0.85),
                    bgColor,
                  ],
                  stops: const [0.0, 0.42, 0.86, 1.0],
                ),
              ),
            ),
          ),

          // 3. Foreground Header Content
          headerContent,
        ],
      ),
    );
  }
  }
}

