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
});
