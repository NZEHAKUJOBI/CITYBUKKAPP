{{flutter_js}}
{{flutter_build_config}}

// No serviceWorkerSettings on purpose: Flutter's built-in service worker is
// deprecated. Offline support comes from our own sw.js, registered in index.html.
_flutter.loader.load();
