/**
 * Supabase client — Mova
 *
 * This module initialises and exports the single shared Supabase client.
 * It is intentionally kept small: no auth helpers, no edge-function calls,
 * no database queries live here. Each feature area should import `supabase`
 * and use it directly or via a dedicated service module in src/services/.
 *
 * Required environment variables (see .env.example):
 *   EXPO_PUBLIC_SUPABASE_URL   — your Supabase project URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY — the project's publishable anon key
 *
 * NEVER add the service-role key or database password to this file or any
 * file that is bundled with the mobile app.
 *
 * Session storage uses expo-secure-store so tokens are persisted securely
 * on-device and survive app restarts.
 */

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { logger } from '@/utils/logger';

// ---------------------------------------------------------------------------
// Environment variables
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project-id.supabase.co' &&
    supabaseAnonKey !== 'your-publishable-anon-key-here'
);

// ---------------------------------------------------------------------------
// Cross-platform secure storage adapter
// Uses localStorage on web and expo-secure-store on native devices.
// ---------------------------------------------------------------------------
const CrossPlatformStorageAdapter = {
  getItem: async (key) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      logger.warn(
        `SecureStore failed to retrieve item for key "${key}":`,
        err?.message || err
      );
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }

      if (typeof value === 'string' && value.length > 2048) {
        logger.warn(
          `SecureStore write warning: payload for key "${key}" is ${value.length} bytes. ` +
            'Values exceeding 2048 bytes can exceed Android Keystore limits on some devices.'
        );
      }

      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      logger.warn(
        `SecureStore failed to persist session for key "${key}":`,
        err?.message || err
      );
      throw err;
    }
  },
  removeItem: async (key) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      logger.warn(
        `SecureStore failed to remove item for key "${key}":`,
        err?.message || err
      );
    }
  },
};

// ---------------------------------------------------------------------------
// Client creation
// If the required environment variables are absent the module exports `null`
// and logs a clear warning. This keeps the app startable without credentials
// while making the gap obvious during development.
// ---------------------------------------------------------------------------
let supabase = null;

if (!isSupabaseConfigured) {
  logger.warn(
    'Supabase is not configured.\n' +
      'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.\n' +
      'See .env.example for the expected variable names.'
  );
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: CrossPlatformStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });
}

export { supabase };

