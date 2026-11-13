class UserProfile {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String avatarUrl;
  final int loyaltyPoints;
  final List<String> savedAddresses;
  final String selectedAddress;
  final bool isDarkMode;

  const UserProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.avatarUrl,
    this.loyaltyPoints = 420,
    this.savedAddresses = const [
      'Shiroro Road by Unity Block, Minna',
      '12 Government Road, GRA, Minna, Niger State',
      'FUT Minna Bosso Campus Gate, Minna, Niger State',
    ],
    this.selectedAddress = 'Shiroro Road by Unity Block, Minna',
    this.isDarkMode = true,
  });

  UserProfile copyWith({
    String? id,
    String? name,
    String? email,
    String? phone,
    String? avatarUrl,
    int? loyaltyPoints,
    List<String>? savedAddresses,
    String? selectedAddress,
    bool? isDarkMode,
  }) {
    return UserProfile(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      loyaltyPoints: loyaltyPoints ?? this.loyaltyPoints,
      savedAddresses: savedAddresses ?? this.savedAddresses,
      selectedAddress: selectedAddress ?? this.selectedAddress,
      isDarkMode: isDarkMode ?? this.isDarkMode,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'phone': phone,
    'avatarUrl': avatarUrl,
    'loyaltyPoints': loyaltyPoints,
    'savedAddresses': savedAddresses,
    'selectedAddress': selectedAddress,
    'isDarkMode': isDarkMode,
  };

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
    id: json['id'] as String,
    name: json['name'] as String,
    email: json['email'] as String,
    phone: json['phone'] as String,
    avatarUrl: json['avatarUrl'] as String,
    loyaltyPoints: json['loyaltyPoints'] as int? ?? 0,
    savedAddresses: (json['savedAddresses'] as List<dynamic>?)
            ?.map((e) => e as String)
            .toList() ??
        [],
    selectedAddress: json['selectedAddress'] as String? ?? '',
    isDarkMode: json['isDarkMode'] as bool? ?? false,
  );
}
