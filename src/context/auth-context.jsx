/**
 * Mova Authentication Context & Provider
 *
 * Centralizes auth session state, initial restoration,
 * Supabase auth state change subscription, and deep linking listener.
 */

import * as Linking from 'expo-linking';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { authService } from '@/services/auth-service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const isConfigured = authService.isConfigured();

  // Restore session and subscribe to auth changes
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      if (!isConfigured) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        // Check if initial deep link URL has auth code
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && (initialUrl.includes('code=') || initialUrl.includes('access_token='))) {
          const callbackResult = await authService.handleCallbackUrl(initialUrl);
          if (callbackResult?.error && isMounted) {
            setError(callbackResult.error.message || 'Authentication callback failed.');
          }
        }

        const { session: currentSession, user: currentUser } = await authService.getSession();
        if (isMounted) {
          setSession(currentSession);
          setUser(currentUser ?? currentSession?.user ?? null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Failed to restore authentication session.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    // Listen for incoming deep links while app is open
    const linkingSubscription = Linking.addEventListener('url', async ({ url }) => {
      if (url && (url.includes('code=') || url.includes('access_token='))) {
        const callbackResult = await authService.handleCallbackUrl(url);
        if (callbackResult?.error && isMounted) {
          setError(callbackResult.error.message || 'Authentication callback failed.');
        }
      }
    });

    // Subscribe to Supabase auth events
    const { data: authListener } = authService.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      linkingSubscription?.remove();
      authListener?.subscription?.unsubscribe();
    };
  }, [isConfigured]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const result = await authService.signInWithGoogle();
    if (result.error && !result.cancelled) {
      setError(result.error.message || 'Failed to sign in with Google.');
    }
    return result;
  }, []);

  const signInWithApple = useCallback(async () => {
    setError(null);
    const result = await authService.signInWithApple();
    if (result.error && !result.cancelled) {
      setError(result.error.message || 'Failed to sign in with Apple.');
    }
    return result;
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    const result = await authService.signOut();
    if (result.error) {
      setError(result.error.message || 'Failed to sign out.');
    } else {
      setSession(null);
      setUser(null);
    }
    return result;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      isLoading,
      isAuthenticated: Boolean(session),
      isConfigured,
      error,
      signInWithGoogle,
      signInWithApple,
      signOut,
      clearError,
    }),
    [
      session,
      user,
      isLoading,
      isConfigured,
      error,
      signInWithGoogle,
      signInWithApple,
      signOut,
      clearError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
