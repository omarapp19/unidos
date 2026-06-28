import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Alias '@' → /src para imports limpios (p. ej. '@/components/ui').
export default defineConfig({
  plugins: [react()],
  // Acepta variables VITE_* y las NEXT_PUBLIC_* ya presentes en `.env`.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    // Separar dependencias estables en chunks cacheables a largo plazo. Así el
    // navegador no re-descarga React/Supabase cuando solo cambia el código app.
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          // Leaflet queda fuera del bundle inicial (se carga con el mapa), pero
          // agrupado para compartir caché entre home y registro.
          leaflet: ['leaflet', 'react-leaflet'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
