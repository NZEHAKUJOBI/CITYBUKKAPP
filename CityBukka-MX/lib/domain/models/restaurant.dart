class Restaurant {
  final String id;
  final String name;
  final String tagline;
  final String description;
  final String coverImageUrl;
  final String logoUrl;
  final double rating;
  final int reviewCount;
  final int deliveryTimeMin;
  final int deliveryTimeMax;
  final double deliveryFee;
  final double distanceKm;
  final List<String> cuisines;
  final bool isFeatured;
  final bool isOpen;
  final String address;
  final List<String> badges;

  const Restaurant({
    required this.id,
    required this.name,
    required this.tagline,
    required this.description,
    required this.coverImageUrl,
    required this.logoUrl,
    this.rating = 4.8,
    this.reviewCount = 240,
    this.deliveryTimeMin = 25,
    this.deliveryTimeMax = 40,
    this.deliveryFee = 650.0,
    this.distanceKm = 2.4,
    required this.cuisines,
    this.isFeatured = false,
    this.isOpen = true,
    required this.address,
    this.badges = const [],
  });

  String get deliveryTimeFormatted => '$deliveryTimeMin - $deliveryTimeMax min';

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'tagline': tagline,
    'description': description,
    'coverImageUrl': coverImageUrl,
    'logoUrl': logoUrl,
    'rating': rating,
    'reviewCount': reviewCount,
    'deliveryTimeMin': deliveryTimeMin,
    'deliveryTimeMax': deliveryTimeMax,
    'deliveryFee': deliveryFee,
    'distanceKm': distanceKm,
    'cuisines': cuisines,
    'isFeatured': isFeatured,
    'isOpen': isOpen,
    'address': address,
    'badges': badges,
  };

  factory Restaurant.fromJson(Map<String, dynamic> json) => Restaurant(
    id: json['id'] as String,
    name: json['name'] as String,
    tagline: json['tagline'] as String,
    description: json['description'] as String,
    coverImageUrl: json['coverImageUrl'] as String,
    logoUrl: json['logoUrl'] as String,
    rating: (json['rating'] as num?)?.toDouble() ?? 4.8,
    reviewCount: json['reviewCount'] as int? ?? 0,
    deliveryTimeMin: json['deliveryTimeMin'] as int? ?? 25,
    deliveryTimeMax: json['deliveryTimeMax'] as int? ?? 40,
    deliveryFee: (json['deliveryFee'] as num?)?.toDouble() ?? 650.0,
    distanceKm: (json['distanceKm'] as num?)?.toDouble() ?? 2.0,
    cuisines: (json['cuisines'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
    isFeatured: json['isFeatured'] as bool? ?? false,
    isOpen: json['isOpen'] as bool? ?? true,
    address: json['address'] as String? ?? '',
    badges: (json['badges'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
  );
}
