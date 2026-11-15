import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

// Publieke gegevens van het Rondje-project. De publishable key mag in de app staan:
// de beveiliging zit in row level security. Overschrijfbaar via app/.env.local.
const DEFAULT_URL = 'https://qgeudipvgwnwekdtyecj.supabase.co';
const DEFAULT_KEY = 'sb_publishable_LC4trHoUoHnYhdqR7XvEzA_oiiKOM39';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY || DEFAULT_KEY;

/** Null als er geen Supabase-gegevens zijn; de app werkt dan alleen lokaal. */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

// Token alleen verversen als de app op de voorgrond is.
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
