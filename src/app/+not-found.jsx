/**
 * Mova 404 / Unmatched Route Screen
 *
 * Catches unknown or unmatched paths and provides a styled, accessible return route.
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/themed-button';
import { ThemedCard } from '@/components/themed-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/theme';

export default function NotFoundScreen() {
  const router = useRouter();

  const handleReturnHome = () => {
    router.replace('/');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedCard variant="outlined" style={styles.card}>
        <ThemedText type="display" style={styles.errorCode}>
          404
        </ThemedText>
        <ThemedText type="h2" style={styles.title}>
          Screen Not Found
        </ThemedText>
        <ThemedText
          type="body"
          themeColor="textSecondary"
          style={styles.description}>
          The screen you are looking for does not exist or has been moved.
        </ThemedText>

        <View style={styles.actionContainer}>
          <ThemedButton
            title="Return Home"
            variant="primary"
            size="md"
            onPress={handleReturnHome}
            accessibilityLabel="Return to Home Screen"
          />
        </View>
      </ThemedCard>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    maxWidth: 420,
    width: '100%',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  errorCode: {
    fontSize: 48,
    lineHeight: 56,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  actionContainer: {
    marginTop: Spacing.xs,
  },
});
