import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class RatingBadge extends StatelessWidget {
  final double rating;
  final int? reviewCount;
  final bool compact;

  const RatingBadge({
    super.key,
    required this.rating,
    this.reviewCount,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 6 : 8,
        vertical: compact ? 2 : 4,
      ),
      decoration: BoxDecoration(
        color: AppColors.secondary.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.star_rounded,
            size: 14,
            color: Color(0xFFD97706),
          ),
          const SizedBox(width: 3),
          Text(
            rating.toStringAsFixed(1),
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: Color(0xFF92400E),
            ),
          ),
          if (reviewCount != null && !compact) ...[
            const SizedBox(width: 3),
            Text(
              '($reviewCount)',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w400,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
