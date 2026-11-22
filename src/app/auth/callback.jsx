/**
 * Mova Web OAuth Callback Route
 *
 * Handles the incoming OAuth redirect at /auth/callback on web.
 * Ensures authentication completes and cleanly redirects to the authenticated app,
 * or displays clear error feedback with a return action if authentication failed.
 */

import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/themed-button';
import { ThemedCard } from '@/components/themed-card';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { isLoading, error, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(app)');
      } else if (!error) {
        router.replace('/(auth)/sign-in');
      }
    }
  }, [isLoading, isAuthenticated, error, router]);

  const handleReturnToSignIn = () => {
    router.replace('/(auth)/sign-in');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {isLoading ? (
        <>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText type="caption" themeColor="textSecondary" style={styles.text}>
            Completing sign in...
          </ThemedText>
        </>
      ) : error ? (
        <ThemedCard variant="outlined" style={[styles.errorCard, { borderColor: theme.error }]}>
          <ThemedText type="h3" style={{ color: theme.error, marginBottom: Spacing.xs }}>
            Authentication Failed
          </ThemedText>
          <ThemedText
            type="bodySmall"
            themeColor="textSecondary"
            style={{ marginBottom: Spacing.md, textAlign: 'center' }}>
            {error}
          </ThemedText>
          <ThemedButton
            title="Return to Sign In"
            variant="primary"
            size="md"
            onPress={handleReturnToSignIn}
            accessibilityLabel="Return to Sign In"
          />
        </ThemedCard>
      ) : (
        <>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText type="caption" themeColor="textSecondary" style={styles.text}>
            Redirecting...
          </ThemedText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  text: {
    marginTop: 12,
  },
  errorCard: {
    maxWidth: 400,
    width: '100%',
    padding: Spacing.lg,
    alignItems: 'center',
  },
});
