/**
 * Mova Authentication Service
 *
 * Implements Google and Apple OAuth through Supabase.
 * Handles OAuth callback/deep linking, session restoration,
 * and sign out.
 */

import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Ensure pending browser sessions are completed (e.g. on web or redirected native sessions)
WebBrowser.maybeCompleteAuthSession();

// Track in-flight requests to prevent duplicate submissions
let isAuthOperationInProgress = false;

// Track processed authorization codes to prevent duplicate PKCE exchanges
const processedAuthCodes = new Set();

export const authService = {
  isConfigured() {
    return isSupabaseConfigured && supabase !== null;
  },

  isOperationInProgress() {
    return isAuthOperationInProgress;
  },

  getRedirectUrl() {
    // Uses the registered scheme "mova" configured in app.json
    return Linking.createURL('auth/callback', { scheme: 'mova' });
  },

  async getSession() {
    if (!this.isConfigured()) {
      return { session: null, user: null, error: null };
    }
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return {
        session: data?.session ?? null,
        user: data?.session?.user ?? null,
        error: null,
      };
    } catch (err) {
      return { session: null, user: null, error: err };
    }
  },

  async getUser() {
    if (!this.isConfigured()) {
      return { user: null, error: null };
    }
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { user: data?.user ?? null, error: null };
    } catch (err) {
      return { user: null, error: err };
    }
  },

  async signInWithOAuth(provider) {
    if (!this.isConfigured()) {
      return {
        success: false,
        cancelled: false,
        error: new Error(
          'Supabase is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.'
        ),
      };
    }

    if (isAuthOperationInProgress) {
      return {
        success: false,
        cancelled: false,
        error: new Error('A sign-in request is already in progress. Please wait.'),
      };
    }

    isAuthOperationInProgress = true;

    try {
      const redirectTo = this.getRedirectUrl();
      const isWeb = Platform.OS === 'web';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: !isWeb,
        },
      });

      if (error) throw error;

      if (isWeb) {
        // On web, Supabase automatically initiates page redirection if skipBrowserRedirect is false
        return { success: true, cancelled: false, data, error: null };
      }

      if (!data?.url) {
        throw new Error(`Failed to obtain OAuth authorization URL for ${provider}.`);
      }

      // Open auth session in device browser / in-app sheet
      const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
        return { success: false, cancelled: true, error: null };
      }

      if (authResult.type === 'success' && authResult.url) {
        return await this.handleCallbackUrl(authResult.url);
      }

      return {
        success: false,
        cancelled: false,
        error: new Error('Authentication session ended without receiving credentials.'),
      };
    } catch (err) {
      return { success: false, cancelled: false, error: err };
    } finally {
      isAuthOperationInProgress = false;
    }
  },

  async handleCallbackUrl(url) {
    if (!this.isConfigured() || !url) {
      return {
        success: false,
        error: new Error('Supabase is not configured or callback URL is missing.'),
      };
    }

    try {
      const parsed = Linking.parse(url);
      let queryParams = { ...(parsed.queryParams || {}) };

      // Parse hash fragment params if present (e.g. #access_token=... or #error=...)
      if (typeof url === 'string' && url.includes('#')) {
        const hashPart = url.split('#')[1];
        if (hashPart) {
          const hashParams = Object.fromEntries(new URLSearchParams(hashPart));
          queryParams = { ...hashParams, ...queryParams };
        }
      }

      // Check if provider returned an error
      if (queryParams?.error || queryParams?.error_description) {
        throw new Error(queryParams.error_description || queryParams.error);
      }

      // PKCE flow: code returned in query parameters
      if (queryParams?.code) {
        if (processedAuthCodes.has(queryParams.code)) {
          const current = await this.getSession();
          if (current.session) {
            return {
              success: true,
              session: current.session,
              user: current.user,
              error: null,
            };
          }
        }
        processedAuthCodes.add(queryParams.code);

        const { data, error } = await supabase.auth.exchangeCodeForSession(queryParams.code);
        if (error) {
          // If code exchange failed (e.g. code already redeemed by concurrent listener or detectSessionInUrl),
          // check if an active session was already established
          const current = await this.getSession();
          if (current.session) {
            return {
              success: true,
              session: current.session,
              user: current.user,
              error: null,
            };
          }
          throw error;
        }
        return {
          success: true,
          session: data?.session ?? null,
          user: data?.user ?? null,
          error: null,
        };
      }

      // Implicit flow: access_token and refresh_token in query or hash fragment
      if (queryParams?.access_token && queryParams?.refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token: queryParams.access_token,
          refresh_token: queryParams.refresh_token,
        });
        if (error) {
          const current = await this.getSession();
          if (current.session) {
            return {
              success: true,
              session: current.session,
              user: current.user,
              error: null,
            };
          }
          throw error;
        }
        return {
          success: true,
          session: data?.session ?? null,
          user: data?.user ?? null,
          error: null,
        };
      }

      // Fallback check if session is already updated in client
      const current = await this.getSession();
      if (current.session) {
        return {
          success: true,
          session: current.session,
          user: current.user,
          error: null,
        };
      }

      return {
        success: false,
        error: new Error('No authorization code or session tokens found in callback URL.'),
      };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  async signInWithGoogle() {
    return this.signInWithOAuth('google');
  },

  async signInWithApple() {
    return this.signInWithOAuth('apple');
  },

  async signOut() {
    if (!this.isConfigured()) {
      return { success: true, error: null };
    }
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  onAuthStateChange(callback) {
    if (!this.isConfigured()) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase.auth.onAuthStateChange(callback);
  },
};
