import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// Alias '@' → /src para imports limpios (p. ej. '@/components/ui').
export default defineConfig({
  plugins: [
    react(),
    // PWA: app instalable + shell cacheado para abrir sin conexión. Las llamadas
    // a Supabase (datos mutables) van por red — la persistencia offline de
    // donaciones la maneja la cola en IndexedDB, no la caché del SW.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo-mark.png'],
      manifest: {
        name: 'Unidos · Centros de Acopio',
        short_name: 'Unidos',
        description: 'Registra donaciones en centros de acopio, incluso sin conexión.',
        lang: 'es-VE',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#fffaf1',
        theme_color: '#fffaf1',
        icons: [
          { src: '/logo-mark.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo-mark.png', sizes: '512x512', type: 'image/png' },
          { src: '/logo-mark.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache del shell (JS/CSS/HTML/fuentes) para arranque offline.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // SPA: cualquier navegación cae en index.html (router del cliente).
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Tipografías de Google: cache-first (cambian poco, pesan).
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        // Permite probar el SW en `vite dev` (no solo en build).
        enabled: true,
        type: 'module',
      },
    }),
  ],
  // Acepta variables VITE_* y las NEXT_PUBLIC_* ya presentes en `.env`.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
