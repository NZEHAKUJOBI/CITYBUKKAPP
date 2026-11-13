import 'package:flutter_test/flutter_test.dart';
import 'package:citybukka_mx/main.dart';

void main() {
  testWidgets('CityBukkaApp boots smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const CityBukkaApp());
    expect(find.byType(CityBukkaApp), findsOneWidget);
    await tester.pumpAndSettle(const Duration(seconds: 3));
  });
}
