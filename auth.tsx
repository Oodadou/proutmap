import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { DEMO, DEMO_ME, demoUpdateName } from './demo';
import { registerForPush } from './push';
import { supabase } from './supabase';

type AuthState = {
  session: Session | null;
  loading: boolean;
  /** Mode démo uniquement : entrer / sortir sans compte */
  demoSignIn: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const DEMO_KEY = 'proutmap-demo-session';
// Une « session » minimale : seule user.id est utilisée par les écrans
const demoSession = { user: { id: DEMO_ME } } as unknown as Session;

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  demoSignIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO) {
      AsyncStorage.getItem(DEMO_KEY)
        .then((v) => setSession(v ? demoSession : null))
        .catch(() => {})
        .finally(() => setLoading(false));
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Dès qu'on est connecté, on enregistre le jeton de notification
  useEffect(() => {
    if (!session) return;
    if (DEMO) Notifications.requestPermissionsAsync().catch(() => {});
    else registerForPush(session.user.id).catch(() => {});
  }, [session?.user.id]);

  async function demoSignIn(name: string) {
    if (name.trim()) await demoUpdateName(name);
    await AsyncStorage.setItem(DEMO_KEY, '1');
    setSession(demoSession);
  }

  async function signOut() {
    if (DEMO) {
      await AsyncStorage.removeItem(DEMO_KEY);
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, loading, demoSignIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
