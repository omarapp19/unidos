/* ===========================================================================
   Cliente Supabase · única instancia compartida (singleton) para toda la app.
   Lee la URL y la clave pública (anon/publishable) del entorno Vite. Si faltan,
   falla rápido con un mensaje claro en vez de errores opacos de red más tarde.
   ========================================================================== */

import { createClient } from '@supabase/supabase-js';

// Soporta tanto los nombres Vite estándar como los NEXT_PUBLIC_* del `.env`.
const url =
  import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Faltan las variables de entorno de Supabase. Define VITE_SUPABASE_URL y ' +
      'VITE_SUPABASE_ANON_KEY (o sus equivalentes NEXT_PUBLIC_*) en tu archivo .env.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
