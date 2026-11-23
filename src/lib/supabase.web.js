/**
 * Supabase client — Mova (Web implementation)
 *
 * Provides web-safe authentication session management using localStorage.
 * Avoids loading native expo-secure-store module during web bundling and SSR.
 */

import { createClient } from '@supabase/supabase-js';

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
// Web storage adapter (localStorage with SSR safety)
// ---------------------------------------------------------------------------
const WebStorageAdapter = {
  getItem: async (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    } catch (err) {
      logger.warn(`WebStorageAdapter failed to retrieve item for key "${key}":`, err?.message || err);
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (err) {
      logger.warn(`WebStorageAdapter failed to persist session for key "${key}":`, err?.message || err);
      throw err;
    }
  },
  removeItem: async (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (err) {
      logger.warn(`WebStorageAdapter failed to remove item for key "${key}":`, err?.message || err);
    }
  },
};

// ---------------------------------------------------------------------------
// Client creation
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
      storage: WebStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export { supabase };
