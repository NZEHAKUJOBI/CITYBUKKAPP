class FoodCategory {
  final String id;
  final String name;
  final String iconEmoji;
  final String description;

  const FoodCategory({
    required this.id,
    required this.name,
    required this.iconEmoji,
    required this.description,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'iconEmoji': iconEmoji,
    'description': description,
  };

  factory FoodCategory.fromJson(Map<String, dynamic> json) => FoodCategory(
    id: json['id'] as String,
    name: json['name'] as String,
    iconEmoji: json['iconEmoji'] as String,
    description: json['description'] as String,
  );
}
