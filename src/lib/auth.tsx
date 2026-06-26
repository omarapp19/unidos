/* ===========================================================================
   AuthProvider · estado global de sesión del admin. Sustituye al mock
   `currentProfile`/`currentCenter`. Mantiene sesión + perfil + centro y los
   recarga al cambiar la sesión (login/logout/refresh de token). Las vistas
   privadas leen de aquí; el guard de rutas usa `status`.
   ========================================================================== */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Center, Profile } from '@/types';
import { supabase } from '@/lib/supabase';
import { getProfile, signIn as apiSignIn, signOut as apiSignOut } from '@/lib/api/auth';
import { getCenterById } from '@/lib/api/centers';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  center: Center | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Recarga perfil + centro (p. ej. tras aprobar/editar el centro). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [center, setCenter] = useState<Center | null>(null);
  // Evita aplicar cargas obsoletas si la sesión cambia mientras resolvemos.
  const loadIdRef = useRef(0);

  /** Carga perfil y centro a partir de una sesión (o limpia si es null). */
  const loadFor = useCallback(async (s: Session | null) => {
    const loadId = ++loadIdRef.current;
    setSession(s);

    if (!s) {
      setProfile(null);
      setCenter(null);
      setStatus('unauthenticated');
      return;
    }

    // Sesión válida pero perfil/centro aún sin resolver: marcar 'loading' para
    // que los guards muestren spinner en vez de tratarla como no autenticada
    // (evita el rebote al login en el primer intento tras iniciar sesión).
    setStatus('loading');

    try {
      const prof = await getProfile(s.user.id);
      const ctr = prof?.center_id ? await getCenterById(prof.center_id) : null;
      if (loadId !== loadIdRef.current) return; // sesión cambió: descartar
      setProfile(prof);
      setCenter(ctr);
    } catch {
      // Si el perfil aún no existe o falla, la sesión sigue siendo válida;
      // las vistas mostrarán su propio estado de error/vacío.
      if (loadId !== loadIdRef.current) return;
      setProfile(null);
      setCenter(null);
    } finally {
      if (loadId === loadIdRef.current) setStatus('authenticated');
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) void loadFor(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      void loadFor(s);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadFor]);

  const signIn = useCallback(async (email: string, password: string) => {
    // onAuthStateChange dispara loadFor; aquí solo propagamos el error si lo hay.
    await apiSignIn(email, password);
  }, []);

  const signOut = useCallback(async () => {
    await apiSignOut();
  }, []);

  const refresh = useCallback(async () => {
    await loadFor(session);
  }, [loadFor, session]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, profile, center, signIn, signOut, refresh }),
    [status, session, profile, center, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
