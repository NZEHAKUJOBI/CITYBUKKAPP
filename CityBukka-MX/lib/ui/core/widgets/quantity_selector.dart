import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class QuantitySelector extends StatelessWidget {
  final int quantity;
  final ValueChanged<int> onChanged;
  final int min;
  final int max;
  final bool compact;

  const QuantitySelector({
    super.key,
    required this.quantity,
    required this.onChanged,
    this.min = 1,
    this.max = 99,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : AppColors.cardLight,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark ? AppColors.dividerDark : AppColors.dividerLight,
          width: 0.8,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildButton(
            icon: Icons.remove,
            onTap: quantity > min ? () => onChanged(quantity - 1) : null,
            compact: compact,
          ),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: compact ? 8 : 12),
            child: Text(
              quantity.toString(),
              style: TextStyle(
                fontSize: compact ? 13 : 15,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          _buildButton(
            icon: Icons.add,
            onTap: quantity < max ? () => onChanged(quantity + 1) : null,
            compact: compact,
          ),
        ],
      ),
    );
  }

  Widget _buildButton({
    required IconData icon,
    required VoidCallback? onTap,
    required bool compact,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: EdgeInsets.all(compact ? 4 : 6),
        child: Icon(
          icon,
          size: compact ? 16 : 18,
          color: onTap != null ? AppColors.primary : Colors.grey.shade400,
        ),
      ),
    );
  }
}
