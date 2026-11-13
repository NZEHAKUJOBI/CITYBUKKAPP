import 'package:flutter/material.dart';
import 'package:citybukka_mx/core/theme/app_colors.dart';
import 'package:citybukka_mx/data/mock_data/bukka_mock_data.dart';
import 'package:citybukka_mx/domain/models/user_profile.dart';

class ProfileScreen extends StatefulWidget {
  final ValueChanged<bool>? onThemeChanged;
  final bool isDarkMode;

  const ProfileScreen({
    super.key,
    this.onThemeChanged,
    this.isDarkMode = false,
  });

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final UserProfile _user = BukkaMockData.initialUser;
  late bool _darkMode;

  @override
  void initState() {
    super.initState();
    _darkMode = widget.isDarkMode;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Edit profile feature enabled!')),
              );
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // User Card
          Row(
            children: [
              CircleAvatar(
                radius: 36,
                backgroundImage: NetworkImage(_user.avatarUrl),
                backgroundColor: AppColors.secondary.withOpacity(0.2),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _user.name,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _user.email,
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _user.phone,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),

          // Bukka MX Loyalty Card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: AppColors.goldGradient,
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: AppColors.secondary.withOpacity(0.3),
                  blurRadius: 14,
                  offset: const Offset(0, 4),
                )
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.military_tech_rounded, color: Colors.black87, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Bukka MX Rewards',
                        style: TextStyle(
                          color: Colors.black87,
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${_user.loyaltyPoints} Fire Points Available (Worth ₦${_user.loyaltyPoints})',
                        style: TextStyle(
                          color: Colors.black.withOpacity(0.7),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Preferences & Settings List
          const Text('App & Dining Settings', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),

          _buildSettingCard(
            isDark: isDark,
            children: [
              SwitchListTile(
                secondary: const Icon(Icons.dark_mode_outlined, color: AppColors.primary),
                title: const Text('Dark Mode Theme', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                value: _darkMode,
                activeColor: AppColors.primary,
                onChanged: (val) {
                  setState(() => _darkMode = val);
                  widget.onThemeChanged?.call(val);
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.location_on_outlined, color: AppColors.primary),
                title: const Text('Saved Addresses', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                subtitle: Text('${_user.savedAddresses.length} addresses', style: const TextStyle(fontSize: 12)),
                trailing: const Icon(Icons.chevron_right, size: 20),
                onTap: () {},
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.restaurant_menu_rounded, color: AppColors.primary),
                title: const Text('Dietary Preferences', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                subtitle: const Text('Halal, Spicy Lover, Peppery', style: TextStyle(fontSize: 12)),
                trailing: const Icon(Icons.chevron_right, size: 20),
                onTap: () {},
              ),
            ],
          ),
          const SizedBox(height: 18),

          const Text('Support & About', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),

          _buildSettingCard(
            isDark: isDark,
            children: [
              ListTile(
                leading: const Icon(Icons.support_agent_rounded, color: AppColors.primary),
                title: const Text('24/7 Bukka Support', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                trailing: const Icon(Icons.chevron_right, size: 20),
                onTap: () {},
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.info_outline, color: AppColors.primary),
                title: const Text('About CityBukka MX', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                subtitle: const Text('v1.0.0 Production Build', style: TextStyle(fontSize: 11)),
                trailing: const Icon(Icons.chevron_right, size: 20),
                onTap: () {},
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Logout Action
          OutlinedButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Logged out of CityBukka MX demo.')),
              );
            },
            icon: const Icon(Icons.logout, color: AppColors.error, size: 18),
            label: const Text('Log Out', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.w700)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.error),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildSettingCard({required bool isDark, required List<Widget> children}) {
    return Material(
      color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isDark ? AppColors.dividerDark : AppColors.dividerLight,
          width: 0.8,
        ),
      ),
      child: Column(children: children),
    );
  }
}
