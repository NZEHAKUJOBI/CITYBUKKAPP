// Builds CityBukka MX as an installable, offline-capable PWA.
//
// Usage (from the CityBukka-MX folder):
//   dart run tool/build_pwa.dart [--base-href=/sub/path/] [extra flutter build args]
//
// Output: build/web  – deploy this folder to any static HTTPS host.
import 'dart:convert';
import 'dart:io';

Future<void> main(List<String> args) async {
  final buildArgs = [
    'build',
    'web',
    '--release',
    // Serve CanvasKit from our own origin so the app can boot offline.
    '--no-web-resources-cdn',
    ...args,
  ];

  stdout.writeln('> flutter ${buildArgs.join(' ')}');
  final build = await Process.start('flutter', buildArgs,
      runInShell: true, mode: ProcessStartMode.inheritStdio);
  final code = await build.exitCode;
  if (code != 0) exit(code);

  final out = Directory('build/web');
  final sw = File('${out.path}/sw.js');
  if (!sw.existsSync()) {
    stderr.writeln('build/web/sw.js not found – is web/sw.js present?');
    exit(1);
  }

  // Version the service-worker cache by the build's content, so a new deploy
  // installs a new worker and discards the old cache.
  final hashInputs = ['main.dart.js', 'flutter_bootstrap.js', 'index.html', 'manifest.json'];
  var hash = 0x811c9dc5; // FNV-1a 32-bit
  for (final name in hashInputs) {
    final f = File('${out.path}/$name');
    if (!f.existsSync()) continue;
    for (final b in f.readAsBytesSync()) {
      hash = ((hash ^ b) * 0x01000193) & 0xffffffff;
    }
  }
  final version = hash.toRadixString(16).padLeft(8, '0');

  final source = sw.readAsStringSync();
  if (!source.contains('__CACHE_VERSION__')) {
    stderr.writeln('Placeholder __CACHE_VERSION__ missing from sw.js');
    exit(1);
  }
  sw.writeAsStringSync(source.replaceAll('__CACHE_VERSION__', version));

  // Flutter still emits its deprecated worker; make sure nothing references it.
  final legacy = File('${out.path}/flutter_service_worker.js');
  if (legacy.existsSync()) legacy.deleteSync();

  stdout.writeln(const JsonEncoder.withIndent('  ').convert({
    'output': out.absolute.path,
    'cacheVersion': version,
  }));
  stdout.writeln('PWA build ready. Serve build/web over HTTPS (or localhost) to test.');
}
