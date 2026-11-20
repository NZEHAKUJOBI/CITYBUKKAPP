/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'Chop City Bukka',
        short_name: 'City Bukka',
        description: 'Authentic Urban Bukka & African Fusion Food Delivery in Minna, Niger State',
        lang: 'en-NG',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#071910',
        theme_color: '#0C2619',
        categories: ['food', 'shopping', 'lifestyle'],
        icons: [
          { src: 'icons/Icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/Icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/Icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/Icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2}'],
        // The admin and rider chunks (lazy-loaded) aren't precached, so customers never download them.
        globIgnores: ['**/AdminApp-*.{js,css}', '**/RiderApp-*.{js,css}'],
        navigateFallback: 'index.html',
        // Admin needs the network anyway; API and uploaded files are never answered with the app shell.
        navigateFallbackDenylist: [/^\/admin(\/|$)/, /^\/api\//, /^\/uploads\//],
        runtimeCaching: [
          {
            // Staff endpoints: never cached (must be listed before the generic /api/ rule).
            urlPattern: ({ url }) => url.pathname.startsWith('/api/admin'),
            handler: 'NetworkOnly',
          },
          {
            // Images uploaded through the admin panel (served by CityBukka-Server).
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'citybukka-uploads',
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Public catalogue + fees: fresh when online, last copy when offline.
            urlPattern: ({ url, request }) => request.method === 'GET'
              && /^\/api\/(categories|restaurants|food-items|meta)(\/|$)/.test(url.pathname),
            handler: 'NetworkFirst',
            options: { cacheName: 'citybukka-api', networkTimeoutSeconds: 5 },
          },
          {
            // Auth, profile, favourites, cart quotes and orders are per-customer: never cached.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    // Forward API calls to CityBukka-Server during development.
    proxy: {
      '/api': 'http://localhost:8080',
      '/uploads': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/setupTests.ts'],
  },
});
