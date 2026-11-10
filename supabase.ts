import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

// Renseignées dans le fichier .env (voir .env.example)
// En mode démo (aucune adresse configurée), une adresse factice évite une erreur au démarrage
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://demo.invalid';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'demo';

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Rafraîchit le jeton seulement quand l'appli est au premier plan
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
