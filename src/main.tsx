import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider } from '@/lib/auth';
import { router } from '@/app/router';
import { registerSW } from 'virtual:pwa-register';
import './index.css';

// Service worker: shell offline + auto-update. Al detectar versión nueva se
// actualiza y recarga sola (registerType 'autoUpdate').
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
